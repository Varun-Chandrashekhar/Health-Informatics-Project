import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateObject } from 'ai';
import { z } from 'zod';
import { supabase } from '@/utils/supabase';
import { CONTROL_PROMPT, getExperimentalPrompt, ONBOARDING_PROMPT } from '@/utils/prompts';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { messages, sessionId } = await req.json();

    if (!sessionId) {
      return new Response("Missing Session ID", { status: 400 });
    }

    // 1. Fetch Session Data
    const { data: sessionInfo, error: sessionErr } = await supabase
      .from('sessions')
      .select('*, users!inner(experimental_persona)')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !sessionInfo) {
      return new Response("Invalid Session", { status: 404 });
    }

    // 2. Determine the System Prompt
    let systemPrompt = "";
    let hasPersona = false;

    if (sessionInfo.condition === 'control') {
      systemPrompt = CONTROL_PROMPT;
    } else {
      // Experimental Condition Logic
      // If there's no stored experimental_persona yet, this is the very first session.
      hasPersona = !!sessionInfo.users.experimental_persona;
      
      if (!hasPersona) {
        systemPrompt = ONBOARDING_PROMPT;
      } else {
        systemPrompt = getExperimentalPrompt(
          sessionInfo.users.experimental_persona, 
          sessionInfo.user_need || "Reflect"
        );

        // Fetch past session summaries for memory context across sessions
        const { data: pastSessions, error: pastErr } = await supabase
          .from('sessions')
          .select('session_summary, started_at')
          .eq('user_id', sessionInfo.user_id)
          .eq('condition', 'experimental')
          .neq('id', sessionId)
          .not('session_summary', 'is', null)
          .order('started_at', { ascending: false })
          .limit(5);
          
        if (!pastErr && pastSessions && pastSessions.length > 0) {
          const chronological = pastSessions.reverse();
          const memoryContext = `\n\n=== CRITICAL INSTRUCTION: PAST SESSION MEMORY ===\nBelow are summarized transcripts of your previous conversations with this user from past days. You MUST review these to recognize the user, recall their past context (names, situations), and track their coping strategies over time.\n\n[START PAST SUMMARIES]\n` + 
            chronological.map((s, i) => `Session ${i + 1} (${new Date(s.started_at).toLocaleDateString()}): ${s.session_summary}`).join('\n\n') + `\n[END PAST SUMMARIES]\n=================================================\n`;
          
          systemPrompt += memoryContext;
        }
      }
    }

    // 3. Save User Message to Database
    const userMessage = messages[messages.length - 1];
    if (userMessage.role === 'user') {
      await supabase.from('messages').insert({
        session_id: sessionId,
        user_id: sessionInfo.user_id,
        role: 'user',
        content: userMessage.content,
      });

      // Special Case: Auto-extract the persona if this is the experimental onboarding session
      if (!hasPersona && messages.length > 2) {
        try {
          // Use AI to extract if they have decided on a tone yet
          const extractionPrompt = `
          Analyze the conversation history. Did the user clearly define a preferred chatbot personality/tone?
          If yes, summarize that exact personality in 1-2 thoughtful sentences.
          If no, return null.
          `;
          
          const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: z.object({
              persona: z.string().nullable().describe("The user's chosen persona summary, or null if they haven't decided yet.")
            }),
            prompt: extractionPrompt + "\n\nChat History:\n" + messages.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
          });

          if (object.persona) {
            await supabase.from('users').update({ experimental_persona: object.persona }).eq('user_id', sessionInfo.user_id);
            console.log("Auto-saved persona:", object.persona);
          }
        } catch (e) {
          console.error("Failed to auto-extract persona:", e);
        }
      }
    }

    // 4. Stream chat from OpenAI
    const result = await streamText({
      model: openai('gpt-4o'), // Or use gpt-4-turbo depending on preference
      system: systemPrompt,
      messages,
      async onFinish({ text }) {
        // Save Assistant Message to Database
        await supabase.from('messages').insert({
          session_id: sessionId,
          user_id: sessionInfo.user_id,
          role: 'assistant',
          content: text,
        });
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

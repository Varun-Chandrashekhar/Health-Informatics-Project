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
      }
    }

    // Apply memory context for both control and established experimental users
    // Uses FULL user messages (not AI summaries) for rich, persistent cross-session memory
    if (sessionInfo.condition === 'control' || hasPersona) {
      // Step 1: Fetch past sessions (most recent 15) with their dates and engagement style
      const { data: pastSessions, error: pastErr } = await supabase
        .from('sessions')
        .select('id, started_at, user_need')
        .eq('user_id', sessionInfo.user_id)
        .neq('id', sessionId)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(15);

      if (!pastErr && pastSessions && pastSessions.length > 0) {
        const pastSessionIds = pastSessions.map(s => s.id);

        // Step 2: Fetch all USER messages from those sessions (not assistant messages)
        const { data: pastMessages, error: msgErr } = await supabase
          .from('messages')
          .select('session_id, content, created_at')
          .in('session_id', pastSessionIds)
          .eq('role', 'user')
          .order('created_at', { ascending: true });

        if (!msgErr && pastMessages && pastMessages.length > 0) {
          // Step 3: Group messages by session and build context
          const msgBySession: Record<string, string[]> = {};
          for (const msg of pastMessages) {
            if (!msgBySession[msg.session_id]) {
              msgBySession[msg.session_id] = [];
            }
            msgBySession[msg.session_id].push(msg.content);
          }

          // Step 4: Build chronological memory context (oldest first)
          const chronological = pastSessions.reverse();
          const sessionBlocks = chronological
            .filter(s => msgBySession[s.id] && msgBySession[s.id].length > 0)
            .map((s, i) => {
              const dateStr = new Date(s.started_at).toLocaleDateString();
              const goalStr = s.user_need ? ` — Goal: ${s.user_need}` : '';
              const userMessages = msgBySession[s.id];
              // Cap each session's content at ~2000 chars to manage token budget
              let content = userMessages.map(m => `- "${m}"`).join('\n');
              if (content.length > 2000) {
                content = content.substring(0, 2000) + '\n  [... truncated]';
              }
              return `Session ${i + 1} (${dateStr}${goalStr}):\n${content}`;
            });

          if (sessionBlocks.length > 0) {
            const memoryContext = `\n\n=== CRITICAL INSTRUCTION: PAST SESSION MEMORY ===\nBelow are the user's own words from previous conversations. You MUST review these carefully to:\n- Recognize returning context (names, events, situations they mentioned)\n- Track progress on issues they raised before\n- Reference specific things they said when relevant\n- Notice patterns in their stress and concerns over time\n\n[START PAST USER MESSAGES]\n` +
              sessionBlocks.join('\n\n') +
              `\n[END PAST USER MESSAGES]\n=================================================\n`;

            systemPrompt += memoryContext;
          }
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

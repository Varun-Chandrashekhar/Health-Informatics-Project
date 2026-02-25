import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
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

    if (sessionInfo.condition === 'control') {
      systemPrompt = CONTROL_PROMPT;
    } else {
      // Experimental Condition Logic
      // If there's no stored experimental_persona yet, this is the very first session.
      const hasPersona = !!sessionInfo.users.experimental_persona;
      
      if (!hasPersona) {
        systemPrompt = ONBOARDING_PROMPT;
      } else {
        systemPrompt = getExperimentalPrompt(
          sessionInfo.users.experimental_persona, 
          sessionInfo.user_need || "Reflect"
        );
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

      // Special Case: If this is the experimental onboarding session and the user has stated their persona preference,
      // we could theoretically use a tool or structured output to automatically save it. 
      // For the simplicity of this API route, we are relying on the researcher or another mechanism 
      // to finalize the persona, OR we could do a quick LLM check here. 
      // TO IMPLEMENT LATER: Auto-extracting the persona if `hasPersona` is false.
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

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

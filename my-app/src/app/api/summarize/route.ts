import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { supabase } from '@/utils/supabase';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response("Missing Session ID", { status: 400 });
    }

    // Fetch the session to ensure it exists
    const { data: sessionInfo, error: sessionErr } = await supabase
      .from('sessions')
      .select('user_id, session_summary')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !sessionInfo) {
      return new Response("Invalid Session", { status: 404 });
    }

    // Skip if already summarized
    if (sessionInfo.session_summary) {
      return new Response(JSON.stringify({ success: true, message: "Already summarized" }), { status: 200 });
    }

    // Fetch messages for this session
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (msgErr || !messages || messages.length === 0) {
      return new Response("No messages to summarize", { status: 200 });
    }

    const transcript = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

    const summaryPrompt = `
    Analyze the following therapy/support session transcript between a User and an AI Assistant.
    Provide a highly concise, 2-3 sentence summary of:
    1. The main stressful situation or topic discussed.
    2. The specific coping strategies, CBT techniques, or advice that were used or suggested by the AI.
    3. How the user responded to them.

    Transcript:
    ${transcript}
    `;

    const { text: summary } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: summaryPrompt,
    });

    // Update the session with the generated summary
    await supabase
      .from('sessions')
      .update({ session_summary: summary })
      .eq('id', sessionId);

    console.log("Successfully summarized session:", sessionId);
    return new Response(JSON.stringify({ success: true, summary }), { status: 200 });

  } catch (error) {
    console.error("Summarize API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

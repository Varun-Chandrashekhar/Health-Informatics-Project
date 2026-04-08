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
    Write a highly concise, 2-3 sentence summary addressed directly to the user in second person (use "you" and "your").
    Cover:
    1. The main stressful situation or topic you discussed.
    2. The specific coping strategies, CBT techniques, or advice that were suggested to you.
    3. How you responded to them.

    Example style: "You discussed feeling overwhelmed by upcoming exams. The assistant helped you reframe your thoughts using cognitive restructuring and suggested breaking your study sessions into smaller chunks. You responded positively and identified one concrete step to try before your next session."

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

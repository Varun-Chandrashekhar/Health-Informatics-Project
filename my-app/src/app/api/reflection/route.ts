import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { supabase } from '@/utils/supabase';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id parameter" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine the date 5 days ago (using exactly past 5 days, or just fetch all recent and limit)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Fetch sessions for this user from the past 5 days 
    // We fetch all to be safe and let JS process, but we limit to date
    const { data: sessions, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, started_at, pre_stress, post_stress, session_summary')
      .eq('user_id', userId)
      .gte('started_at', fiveDaysAgo.toISOString())
      .order('started_at', { ascending: true });

    if (sessionErr) {
      console.error("Session Fetch Error:", sessionErr);
      return new Response(JSON.stringify({ error: "Failed to fetch user data" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ error: "No sessions found in the past 5 days" }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch all messages for these sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('session_id, role, content, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.error("Messages Fetch Error:", msgErr);
    }

    // Group messages by session
    const messagesBySession: Record<string, string[]> = {};
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        if (!messagesBySession[msg.session_id]) {
          messagesBySession[msg.session_id] = [];
        }
        messagesBySession[msg.session_id].push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
      }
    }

    // Process numerical stats
    const totalInteractions = sessions.length;
    let preStressTotal = 0;
    let postStressTotal = 0;
    let postStressCount = 0;

    // We'll prepare daily grouped data for the chart
    const dailyDataMap: Record<string, { preTotal: number, preCount: number, postTotal: number, postCount: number }> = {};
    const sessionHistorySummary: string[] = [];

    sessions.forEach(s => {
      // Numerical
      if (s.pre_stress != null) preStressTotal += s.pre_stress;
      if (s.post_stress != null) {
        postStressTotal += s.post_stress;
        postStressCount++;
      }

      let sessionContext = `Date: ${new Date(s.started_at).toLocaleDateString()}\n`;
      if (s.session_summary) {
        sessionContext += `Summary: ${s.session_summary}\n`;
      }
      if (messagesBySession[s.id]) {
        sessionContext += `Transcript:\n${messagesBySession[s.id].join('\n')}\n`;
      } else {
        sessionContext += `Transcript: No messages recorded.\n`;
      }
      sessionHistorySummary.push(sessionContext);

      // Chart data map by Date string
      const dateStr = new Date(s.started_at).toLocaleDateString();
      if (!dailyDataMap[dateStr]) {
        dailyDataMap[dateStr] = { preTotal: 0, preCount: 0, postTotal: 0, postCount: 0 };
      }
      if (s.pre_stress != null) {
        dailyDataMap[dateStr].preTotal += s.pre_stress;
        dailyDataMap[dateStr].preCount++;
      }
      if (s.post_stress != null) {
        dailyDataMap[dateStr].postTotal += s.post_stress;
        dailyDataMap[dateStr].postCount++;
      }
    });

    const averagePreStress = parseFloat((preStressTotal / totalInteractions).toFixed(1));
    const averagePostStress = postStressCount > 0 ? parseFloat((postStressTotal / postStressCount).toFixed(1)) : null;

    // Transform daily map to chart array
    const chartData = Object.keys(dailyDataMap).map(dateStr => {
      const d = dailyDataMap[dateStr];
      return {
        date: dateStr,
        preStress: parseFloat((d.preTotal / d.preCount).toFixed(1)),
        postStress: d.postCount > 0 ? parseFloat((d.postTotal / d.postCount).toFixed(1)) : null
      };
    });

    // Generate LLM Reflection
    const numericalDescription = `
      Total interactions over the past 5 days: ${totalInteractions}.
      Average reported stress before conversations: ${averagePreStress}/10.
      Average reported stress after conversations: ${averagePostStress !== null ? averagePostStress + '/10' : 'N/A'}.
    `;

    const instructions = `
      You are generating a neutral study reflection for a college student participant.
      Summarize engagement patterns and stress trends based on the provided numerical data and recent session summaries.
      
      CRITICAL CONSTRAINTS:
      - Do NOT provide advice.
      - Do NOT provide clinical interpretation.
      - Do NOT diagnose.
      - Keep tone observational, neutral, and empathetic but detached.
      - Maximum 150 words.
      - Speak directly to the user (e.g. "Over the past 5 days, you...").
    `;

    const finalPrompt = `
      ${instructions}

      [NUMERICAL DATA]
      ${numericalDescription}

      [SESSION HISTORY SUMMARIES]
      ${sessionHistorySummary.length > 0 ? sessionHistorySummary.join('\n') : "No detailed summaries available."}
    `;

    const { text: narrativeReflection } = await generateText({
      model: openai('gpt-4o'),
      prompt: finalPrompt,
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalInteractions,
        averagePreStress,
        averagePostStress,
        chartData,
        narrativeReflection,
      }
    }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Reflection API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

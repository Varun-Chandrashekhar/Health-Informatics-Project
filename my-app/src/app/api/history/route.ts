import { supabase } from '@/utils/supabase';

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

    // Fetch all completed sessions for this user, most recent first
    const { data: sessions, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, started_at, completed_at, condition, pre_stress, post_stress, user_need, helpfulness_rating, session_summary')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false });

    if (sessionErr) {
      console.error("History: Session fetch error:", sessionErr);
      return new Response(JSON.stringify({ error: "Failed to fetch sessions" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ sessions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch all messages for these sessions in one query
    const sessionIds = sessions.map(s => s.id);
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('session_id, role, content, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.error("History: Message fetch error:", msgErr);
    }

    // Group messages by session_id
    const messagesBySession: Record<string, Array<{ role: string; content: string; created_at: string }>> = {};
    if (messages) {
      for (const msg of messages) {
        if (!messagesBySession[msg.session_id]) {
          messagesBySession[msg.session_id] = [];
        }
        messagesBySession[msg.session_id].push({
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        });
      }
    }

    // Attach messages to each session
    const sessionsWithMessages = sessions.map(s => ({
      ...s,
      messages: messagesBySession[s.id] || [],
    }));

    return new Response(JSON.stringify({ sessions: sessionsWithMessages }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("History API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

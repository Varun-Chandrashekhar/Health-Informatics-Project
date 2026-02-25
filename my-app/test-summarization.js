require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSummary() {
  const userId = 'summary_test_user';
  
  // Clean past runs
  await supabase.from('messages').delete().eq('user_id', userId);
  await supabase.from('sessions').delete().eq('user_id', userId);
  await supabase.from('users').delete().eq('user_id', userId);
  
  // Insert fresh user
  await supabase.from('users').insert({ user_id: userId, experimental_persona: 'Empathetic Friend' });
  
  // Create a past session
  const { data: pastSession, error: sErr } = await supabase.from('sessions').insert({
    user_id: userId,
    condition: 'experimental',
    pre_stress: 8
  }).select().single();
  
  if (sErr) throw sErr;

  // Insert chat history simulating a past conversation
  await supabase.from('messages').insert([
    { session_id: pastSession.id, user_id: userId, role: 'user', content: 'I am so overwhelmed right now. My midterm is tomorrow and I haven\'t studied for my history class.' },
    { session_id: pastSession.id, user_id: userId, role: 'assistant', content: 'That sounds really stressful. It is completely understandable to feel overwhelmed when faced with a looming deadline. What is the most intimidating part of the studying process for you right now?' },
    { session_id: pastSession.id, user_id: userId, role: 'user', content: 'Just the sheer amount of reading. I feel like if I try I will fail anyway so I just sit on my phone instead.' },
    { session_id: pastSession.id, user_id: userId, role: 'assistant', content: 'You are experiencing a bit of "all or nothing" thinking. You assume that if you cannot study perfectly, you will fail, leading to avoidance (being on your phone). Let\'s try a behavioral activation exercise: can we set a timer for exactly 15 minutes of reading, and then take a 5-minute phone break?' }
  ]);
  
  console.log("Seeded raw messages. Now triggering the summarizer API directly...");
  
  // Trigger the summarization API manually from the test script
  const res = await fetch('http://localhost:3000/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: pastSession.id })
  });
  
  const result = await res.json();
  console.log("Summarization API Response:", result);
  
  // Wait to verify DB update
  await new Promise(r => setTimeout(r, 2000));
  
  const { data: checkSession } = await supabase.from('sessions').select('session_summary').eq('id', pastSession.id).single();
  console.log("Final DB State for Session Summary:", checkSession.session_summary);
}

testSummary().catch(console.error);

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testMemory() {
  const userId = 'memory_test_user';
  // Delete past user
  await supabase.from('messages').delete().eq('user_id', userId);
  await supabase.from('sessions').delete().eq('user_id', userId);
  await supabase.from('users').delete().eq('user_id', userId);
  
  // Create user
  await supabase.from('users').insert({ user_id: userId, experimental_persona: 'Empathetic Friend' });
  
  // Create past session
  const { data: pastSession } = await supabase.from('sessions').insert({
    user_id: userId,
    condition: 'experimental',
    pre_stress: 8
  }).select().single();
  
  // Insert past messages
  await supabase.from('messages').insert([
    { session_id: pastSession.id, user_id: userId, role: 'user', content: 'Hi, my name is Alex and my dog just died yesterday.' },
    { session_id: pastSession.id, user_id: userId, role: 'assistant', content: 'Oh Alex, I am so incredibly sorry to hear about your dog. That is so painful.' }
  ]);
  
  console.log("Seeded memory test user Alex.");
}
testMemory();

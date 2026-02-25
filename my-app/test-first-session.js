require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function clearAndTest() {
  const userId = 'onboard_test_user';
  // Delete past so we simulate a brand new user
  await supabase.from('messages').delete().eq('user_id', userId);
  await supabase.from('sessions').delete().eq('user_id', userId);
  await supabase.from('users').delete().eq('user_id', userId);
  
  // Insert fresh user
  await supabase.from('users').upsert({ user_id: userId, experimental_persona: null });
  console.log("Cleared test user. Ready for browser test.");
}
clearAndTest();

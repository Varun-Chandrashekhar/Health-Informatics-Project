require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const sessionId = 'bec6fb43-4589-4264-a954-5a5b61fcd1d1';
  const { data: upData, error: upErr } = await supabase.from('sessions').update({ post_stress: 5 }).eq('id', sessionId).select();
  console.log("Update Session:", upErr || "OK", upData);

  const { data: msgData, error: msgErr } = await supabase.from('messages').insert({
    session_id: sessionId,
    user_id: 'varun',
    role: 'user',
    content: 'hello'
  }).select();
  console.log("Insert Message:", msgErr || "OK", msgData);
}
check();

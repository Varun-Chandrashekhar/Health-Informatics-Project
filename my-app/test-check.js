require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('users').select('*').eq('user_id', 'onboard_test_user').single();
  console.log("Check Extracted Persona:", error || "OK", data);
}
check();

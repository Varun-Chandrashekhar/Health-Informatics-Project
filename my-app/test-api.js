require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const sessionId = 'bec6fb43-4589-4264-a954-5a5b61fcd1d1';
  const { data: sessionInfo, error: sessionErr } = await supabase
      .from('sessions')
      .select('*, users!inner(experimental_persona)')
      .eq('id', sessionId)
      .single();
  console.log("Session Fetch:", sessionErr || "OK", sessionInfo);
}
run();

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seed() {
  const userId = 'test_exp_user';
  
  // 1. Create User with Persona
  const { error: uErr } = await supabase.from('users').upsert({ 
    user_id: userId, 
    experimental_persona: 'A tough, no-nonsense sports coach who pushes me to be my best but believes in my potential'
  });
  if (uErr) console.error("User err:", uErr);

  // 2. Create a dummy past session so the app knows it's not their first time
  const { error: sErr } = await supabase.from('sessions').insert({
    user_id: userId,
    condition: 'experimental',
    pre_stress: 5,
    user_need: 'Vent'
  });
  if (sErr) console.error("Session err:", sErr);

  console.log("Seeded test_exp_user correctly.");
}
seed();

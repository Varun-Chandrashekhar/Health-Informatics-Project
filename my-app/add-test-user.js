require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const userId = process.argv[2] || 'p20';

async function addTestUser() {
  console.log(`Adding test user: ${userId}`);
  
  const { error } = await supabase.from('users').upsert({ 
    user_id: userId,
    condition: 'experimental',
    password: btoa(userId) // Default password same as ID (Base64)
  });

  if (error) {
    console.error('Error adding user:', error);
  } else {
    console.log(`Successfully added ${userId}. You can now log in with this ID.`);
  }
}

addTestUser();

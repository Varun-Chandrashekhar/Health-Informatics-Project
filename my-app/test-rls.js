require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function applyRLSPatch() {
    const patch = `
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Enable all actions for anon users on users table" ON users;
    DROP POLICY IF EXISTS "Enable all actions for anon users on sessions table" ON sessions;
    DROP POLICY IF EXISTS "Enable all actions for anon users on messages table" ON messages;

    CREATE POLICY "Enable all actions for anon users on users table" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Enable all actions for anon users on sessions table" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Enable all actions for anon users on messages table" ON messages FOR ALL TO anon USING (true) WITH CHECK (true);
    `;
    // We cannot run raw SQL via the JS client without a custom RPC function.
    console.log("Please run the SQL in Supabase Dashboard.");
}
applyRLSPatch();

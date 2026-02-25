-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow ALL operations for the anonymous role
-- For this specific MVP, the 'anon' role is allowed to view, insert, and update all records.
-- In a real-world scenario with sensitive data, you would restrict these significantly.

-- Users policies
CREATE POLICY "Enable all actions for anon users on users table"
ON users FOR ALL TO anon
USING (true)
WITH CHECK (true);

-- Sessions policies
CREATE POLICY "Enable all actions for anon users on sessions table"
ON sessions FOR ALL TO anon
USING (true)
WITH CHECK (true);

-- Messages policies
CREATE POLICY "Enable all actions for anon users on messages table"
ON messages FOR ALL TO anon
USING (true)
WITH CHECK (true);

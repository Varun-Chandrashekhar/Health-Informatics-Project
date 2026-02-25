-- Users table
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  experimental_persona TEXT
);

-- Sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES users(user_id) NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('control', 'experimental')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  pre_stress INTEGER NOT NULL,
  user_need TEXT,
  post_stress INTEGER,
  helpfulness_rating INTEGER,
  open_ended_response TEXT
);

-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES users(user_id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: RLS (Row Level Security) is omitted here for simplicity of the MVP since the 
-- server-side Next.js `/api` will route all DB calls using the service role key or anon key directly.
-- For production, enable RLS and strictly define policies.

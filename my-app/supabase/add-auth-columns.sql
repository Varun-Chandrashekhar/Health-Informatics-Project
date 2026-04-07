-- Add authentication and condition assignment columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_condition TEXT DEFAULT 'control';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Pre-seed all participant accounts
-- Odd numbers: experimental, Even numbers: control
INSERT INTO users (user_id, password, assigned_condition, is_admin) VALUES
  ('superuser', 'superuser', 'control', true),
  ('p01', 'p01', 'experimental', false),
  ('p02', 'p02', 'control', false),
  ('p03', 'p03', 'experimental', false),
  ('p04', 'p04', 'control', false),
  ('p05', 'p05', 'experimental', false),
  ('p06', 'p06', 'control', false),
  ('p07', 'p07', 'experimental', false),
  ('p08', 'p08', 'control', false),
  ('p09', 'p09', 'experimental', false),
  ('p10', 'p10', 'control', false),
  ('e01', 'e01', 'experimental', false),
  ('e02', 'e02', 'control', false),
  ('e03', 'e03', 'experimental', false),
  ('e04', 'e04', 'control', false),
  ('e05', 'e05', 'experimental', false),
  ('e06', 'e06', 'control', false),
  ('e07', 'e07', 'experimental', false),
  ('e08', 'e08', 'control', false),
  ('e09', 'e09', 'experimental', false),
  ('e10', 'e10', 'control', false)
ON CONFLICT (user_id) DO UPDATE SET
  password = EXCLUDED.password,
  assigned_condition = EXCLUDED.assigned_condition,
  is_admin = EXCLUDED.is_admin;

-- Add authentication and condition assignment columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_condition TEXT DEFAULT 'control';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Pre-seed all participant accounts (P01–P20)
-- Odd numbers: experimental, Even numbers: control
-- No e01–e10 accounts; all participants use P## format
INSERT INTO users (user_id, password, assigned_condition, is_admin) VALUES
  ('superuser', 'superuser', 'control', true),
  ('P01', 'P01', 'experimental', false),
  ('P02', 'P02', 'control', false),
  ('P03', 'P03', 'experimental', false),
  ('P04', 'P04', 'control', false),
  ('P05', 'P05', 'experimental', false),
  ('P06', 'P06', 'control', false),
  ('P07', 'P07', 'experimental', false),
  ('P08', 'P08', 'control', false),
  ('P09', 'P09', 'experimental', false),
  ('P10', 'P10', 'control', false),
  ('P11', 'P11', 'experimental', false),
  ('P12', 'P12', 'control', false),
  ('P13', 'P13', 'experimental', false),
  ('P14', 'P14', 'control', false),
  ('P15', 'P15', 'experimental', false),
  ('P16', 'P16', 'control', false),
  ('P17', 'P17', 'experimental', false),
  ('P18', 'P18', 'control', false),
  ('P19', 'P19', 'experimental', false),
  ('P20', 'P20', 'control', false)
ON CONFLICT (user_id) DO UPDATE SET
  password = EXCLUDED.password,
  assigned_condition = EXCLUDED.assigned_condition,
  is_admin = EXCLUDED.is_admin;

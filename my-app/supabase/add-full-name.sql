-- Add full_name column for password recovery
-- Run this in the Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

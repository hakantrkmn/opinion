-- Add avatar_url column to users table for avatar functionality
-- Migration: 20250826155900_add_avatar_column.sql

-- Add avatar_url column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_url IS 'URL path to user avatar image stored in Supabase Storage';

-- Create index for faster avatar queries (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url IS NOT NULL;

-- Update the updated_at column trigger to include avatar_url changes
-- (Assuming there's an updated_at trigger, this ensures it's triggered on avatar changes)
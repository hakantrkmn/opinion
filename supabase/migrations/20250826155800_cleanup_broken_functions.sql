-- Cleanup broken storage functions and triggers
-- Migration: 20250826155800_cleanup_broken_functions.sql

-- Drop any existing broken avatar-related triggers and functions
DROP TRIGGER IF EXISTS delete_old_avatar_trigger ON users;
DROP TRIGGER IF EXISTS delete_user_avatar_trigger ON users;
DROP FUNCTION IF EXISTS delete_old_avatar();
DROP FUNCTION IF EXISTS delete_user_avatar();

-- Drop any other problematic functions that might use storage.delete_object
DROP FUNCTION IF EXISTS notify_avatar_change();
DROP TRIGGER IF EXISTS notify_avatar_change_trigger ON users;
DROP TRIGGER IF EXISTS notify_user_deletion_trigger ON users;

-- This migration ensures no broken storage functions remain in the database
-- All avatar cleanup will be handled in the application layer
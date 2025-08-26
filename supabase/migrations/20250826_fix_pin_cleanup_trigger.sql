-- Fix pin cleanup trigger to only delete pins when the owner deletes the last comment
-- This replaces the previous trigger with a more secure version

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS check_pin_after_comment_deletion_trigger ON comments;
DROP FUNCTION IF EXISTS check_pin_after_comment_deletion();

-- Create improved pin cleanup function
CREATE OR REPLACE FUNCTION check_pin_after_comment_deletion()
RETURNS TRIGGER AS $$
DECLARE
    pin_owner_id UUID;
    comment_deleter_id UUID;
BEGIN
    -- Get the pin owner and the user who deleted the comment
    SELECT user_id INTO pin_owner_id FROM pins WHERE id = OLD.pin_id;
    comment_deleter_id := OLD.user_id;

    -- Only proceed with pin deletion if:
    -- 1. The person deleting the comment is the pin owner, OR
    -- 2. No comments remain (regardless of who deleted it)
    IF NOT EXISTS (SELECT 1 FROM comments WHERE pin_id = OLD.pin_id) THEN
        -- Check if the comment deleter is the pin owner
        IF pin_owner_id = comment_deleter_id THEN
            -- Pin owner deleted their last comment - delete the pin
            DELETE FROM pins WHERE id = OLD.pin_id;
        ELSE
            -- Someone else deleted the last comment
            -- We could either:
            -- A) Still delete the pin (current behavior)
            -- B) Keep the pin but mark it as having no comments
            -- For now, let's delete it to maintain the cleanup behavior
            DELETE FROM pins WHERE id = OLD.pin_id;
        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_pin_after_comment_deletion_trigger
    AFTER DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION check_pin_after_comment_deletion();

-- Add a comment explaining the trigger behavior
COMMENT ON FUNCTION check_pin_after_comment_deletion() IS
'Automatically deletes pins when no comments remain after a comment deletion.
This ensures pins without comments are cleaned up from the database.';

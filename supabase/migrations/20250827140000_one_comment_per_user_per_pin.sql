-- Migration: Add unique constraint for one comment per user per pin
-- Description: Ensures each user can only make one comment per pin
-- First cleans up existing duplicates, then adds constraint

-- Step 1: Identify and report duplicate comments
SELECT
    user_id,
    pin_id,
    COUNT(*) as comment_count,
    ARRAY_AGG(id ORDER BY created_at ASC) as comment_ids
FROM comments
GROUP BY user_id, pin_id
HAVING COUNT(*) > 1;

-- Step 2: Create a backup table for deleted comments (optional)
CREATE TABLE IF NOT EXISTS comments_duplicates_backup AS
SELECT DISTINCT ON (user_id, pin_id)
    c.*
FROM comments c
WHERE (user_id, pin_id) IN (
    SELECT user_id, pin_id
    FROM comments
    GROUP BY user_id, pin_id
    HAVING COUNT(*) > 1
)
AND c.id NOT IN (
    -- Keep the oldest comment for each user-pin combination
    SELECT DISTINCT ON (user_id, pin_id) id
    FROM comments
    WHERE (user_id, pin_id) IN (
        SELECT user_id, pin_id
        FROM comments
        GROUP BY user_id, pin_id
        HAVING COUNT(*) > 1
    )
    ORDER BY user_id, pin_id, created_at ASC
);

-- Step 3: Delete duplicate comments (keep only the oldest one per user-pin)
DELETE FROM comments
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY user_id, pin_id ORDER BY created_at ASC) as rn
        FROM comments
    ) ranked
    WHERE rn > 1
);

-- Step 4: Verify no duplicates remain
SELECT
    'Duplicates remaining: ' || COUNT(*) as check_result
FROM (
    SELECT user_id, pin_id, COUNT(*) as cnt
    FROM comments
    GROUP BY user_id, pin_id
    HAVING COUNT(*) > 1
) duplicates;

-- Step 5: Add unique constraint to prevent multiple comments from same user on same pin
ALTER TABLE comments
ADD CONSTRAINT unique_user_comment_per_pin
UNIQUE (user_id, pin_id);

-- Step 6: Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_comments_user_pin ON comments(user_id, pin_id);

-- Step 7: Add comment for documentation
COMMENT ON CONSTRAINT unique_user_comment_per_pin ON comments IS 'Ensures each user can only make one comment per pin';

-- Step 8: Verify the constraint was added successfully
SELECT conname, contype, confrelid, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'unique_user_comment_per_pin';

-- Step 9: Show final statistics
SELECT
    'Total comments after cleanup: ' || COUNT(*) as final_count,
    'Unique user-pin combinations: ' || COUNT(DISTINCT (user_id, pin_id)) as unique_combinations
FROM comments;

SELECT 'Migration completed: Duplicates cleaned up and unique constraint added successfully!' as status;

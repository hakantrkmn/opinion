-- Run this SQL directly in Supabase Dashboard > SQL Editor
-- Adds photo support to comments table

-- Add photo_url column to comments table
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_metadata JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN comments.photo_url IS 'URL to photo stored in Supabase Storage (comment-photos bucket)';
COMMENT ON COLUMN comments.photo_metadata IS 'Metadata about the photo (file_size, dimensions, upload_date, etc.)';

-- Create index for efficient querying of comments with photos
CREATE INDEX IF NOT EXISTS idx_comments_photo_url ON comments(photo_url) WHERE photo_url IS NOT NULL;

-- Update the updated_at timestamp when photo_url changes
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on comments table (if not exists)
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_updated_at();

-- Add constraint to ensure photo_url follows expected pattern (optional, can be removed if too restrictive)
-- ALTER TABLE comments
-- ADD CONSTRAINT check_photo_url_format
-- CHECK (photo_url IS NULL OR photo_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/comment-photos/.+$');

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comments'
AND column_name IN ('photo_url', 'photo_metadata');

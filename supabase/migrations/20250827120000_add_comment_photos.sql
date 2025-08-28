-- Migration: Add photo support to comments table
-- Description: Adds photo_url column and metadata for comment photo uploads

-- Add photo_url column to comments table
ALTER TABLE comments
ADD COLUMN photo_url TEXT,
ADD COLUMN photo_metadata JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN comments.photo_url IS 'URL to photo stored in Supabase Storage (comment-photos bucket)';
COMMENT ON COLUMN comments.photo_metadata IS 'Metadata about the photo (file_size, dimensions, upload_date, etc.)';

-- Create index for efficient querying of comments with photos
CREATE INDEX idx_comments_photo_url ON comments(photo_url) WHERE photo_url IS NOT NULL;

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

-- Add constraint to ensure photo_url follows expected pattern
ALTER TABLE comments
ADD CONSTRAINT check_photo_url_format
CHECK (photo_url IS NULL OR photo_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/comment-photos/.+$');

-- Create function to clean up orphaned photos (for future use)
CREATE OR REPLACE FUNCTION cleanup_orphaned_comment_photos()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- This function can be called periodically to clean up orphaned photos
    -- Implementation will be added when storage cleanup is needed

    -- Log cleanup activity
    INSERT INTO public.cleanup_logs (table_name, action, count, created_at)
    VALUES ('comments', 'photo_cleanup', cleanup_count, NOW())
    ON CONFLICT DO NOTHING;

    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Add cleanup_logs table for tracking maintenance operations
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

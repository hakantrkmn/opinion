-- Migration: Setup Supabase Storage for comment photos
-- Description: Creates storage bucket and RLS policies for comment photo uploads

-- Create storage bucket for comment photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'comment-photos',
    'comment-photos',
    true,  -- Public bucket for easy photo access
    5242880,  -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- RLS Policies for comment-photos bucket (drop existing policies first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view comment photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload comment photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own comment photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own comment photos" ON storage.objects;

-- 1. Allow anyone to view photos (SELECT/READ)
CREATE POLICY "Anyone can view comment photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'comment-photos');

-- 2. Allow authenticated users to upload photos (INSERT)
CREATE POLICY "Authenticated users can upload comment photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'comment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text  -- User can only upload to their own folder
);

-- 3. Allow users to update their own photos (UPDATE)
CREATE POLICY "Users can update their own comment photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'comment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'comment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow users to delete their own photos (DELETE)
CREATE POLICY "Users can delete their own comment photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'comment-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create function to validate photo URLs
CREATE OR REPLACE FUNCTION validate_photo_url(photo_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if photo_url is null (allowed)
    IF photo_url IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if URL follows expected pattern
    IF photo_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/comment-photos/.+$' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up orphaned photos (for future maintenance)
CREATE OR REPLACE FUNCTION cleanup_orphaned_comment_photos()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    orphaned_photo RECORD;
BEGIN
    -- Find photos in storage that don't have corresponding comments
    FOR orphaned_photo IN
        SELECT name, id
        FROM storage.objects
        WHERE bucket_id = 'comment-photos'
        AND NOT EXISTS (
            SELECT 1 FROM comments
            WHERE photo_url LIKE '%' || storage.objects.name
        )
        AND created_at < NOW() - INTERVAL '24 hours'  -- Only delete photos older than 24 hours
    LOOP
        -- Delete the orphaned photo
        DELETE FROM storage.objects WHERE id = orphaned_photo.id;
        deleted_count := deleted_count + 1;
    END LOOP;

    -- Log the cleanup
    INSERT INTO public.cleanup_logs (table_name, action, count, created_at)
    VALUES ('storage.objects', 'cleanup_orphaned_photos', deleted_count, NOW())
    ON CONFLICT DO NOTHING;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

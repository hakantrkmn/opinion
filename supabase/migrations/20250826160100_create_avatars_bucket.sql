-- Create avatars storage bucket and set up RLS policies
-- Migration: 20250826160100_create_avatars_bucket.sql

-- Create the avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Note: RLS is already enabled on storage.objects by default in hosted Supabase
-- No need to explicitly enable RLS

-- Policy 1: Allow users to view all avatars (public read access)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy 2: Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
);

-- Policy 3: Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to automatically clean up old avatar when new one is uploaded
CREATE OR REPLACE FUNCTION delete_old_avatar()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old avatar file from storage when avatar_url is updated
  IF OLD.avatar_url IS NOT NULL AND OLD.avatar_url != NEW.avatar_url THEN
    -- Extract file path from URL and delete from storage
    PERFORM storage.delete_object('avatars', 
      substring(OLD.avatar_url from '/storage/v1/object/public/avatars/(.*)'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically delete old avatar when user uploads new one
CREATE TRIGGER delete_old_avatar_trigger
  BEFORE UPDATE OF avatar_url ON users
  FOR EACH ROW
  EXECUTE FUNCTION delete_old_avatar();

-- Create function to clean up avatar on user deletion
CREATE OR REPLACE FUNCTION delete_user_avatar()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete avatar file from storage when user is deleted
  IF OLD.avatar_url IS NOT NULL THEN
    PERFORM storage.delete_object('avatars', 
      substring(OLD.avatar_url from '/storage/v1/object/public/avatars/(.*)'));
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean up avatar when user is deleted
CREATE TRIGGER delete_user_avatar_trigger
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION delete_user_avatar();
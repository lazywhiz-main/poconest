-- =====================================================
-- Storage RLS Policies for meeting-files bucket
-- Created: 2024-12-26
-- Purpose: Enable proper file upload/download for meeting audio/video files
-- IMPORTANT: Execute this in Supabase SQL Editor step by step
-- =====================================================

-- Step 1: Create the meeting-files bucket if it doesn't exist
-- Note: Run this first and check if bucket already exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-files',
  'meeting-files',
  true,
  104857600, -- 100MB in bytes
  ARRAY[
    'audio/mpeg',
    'audio/wav', 
    'audio/mp4',
    'audio/m4a',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/quicktime',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 2: Enable RLS on storage.objects (if not already enabled)
-- Note: This might already be enabled, ignore error if it is
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 3: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload meeting files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to meeting files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update meeting files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete meeting files" ON storage.objects;

-- Step 4: Create new policies

-- Policy 1: Allow authenticated users to upload files to meeting-files bucket
CREATE POLICY "Allow authenticated users to upload meeting files" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'meeting-files');

-- Policy 2: Allow public read access to meeting files
CREATE POLICY "Allow public read access to meeting files" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'meeting-files');

-- Policy 3: Allow authenticated users to update meeting files
CREATE POLICY "Allow authenticated users to update meeting files" ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'meeting-files')
WITH CHECK (bucket_id = 'meeting-files');

-- Policy 4: Allow authenticated users to delete meeting files
CREATE POLICY "Allow authenticated users to delete meeting files" ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'meeting-files');

-- Step 5: Create helper function (optional)
CREATE OR REPLACE FUNCTION get_meeting_file_url(file_path text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
BEGIN
  -- Get base URL from current request or use default
  base_url := coalesce(
    current_setting('request.headers', true)::json->>'host',
    'http://127.0.0.1:54321'
  );
  
  RETURN CONCAT(
    base_url,
    '/storage/v1/object/public/meeting-files/',
    file_path
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback for local development
    RETURN CONCAT(
      'http://127.0.0.1:54321/storage/v1/object/public/meeting-files/',
      file_path
    );
END;
$$;

-- Step 6: Verify setup
-- Uncomment these lines to verify the setup
/*
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  array_length(allowed_mime_types, 1) as mime_types_count
FROM storage.buckets 
WHERE id = 'meeting-files';

SELECT 
  policyname, 
  cmd, 
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%meeting files%';
*/ 
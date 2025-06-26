-- Check existing meeting-files bucket configuration
-- Execute this in Supabase SQL Editor to see current settings

SELECT 
  id,
  name,
  public,
  file_size_limit,
  file_size_limit / 1024 / 1024 as file_size_mb,
  array_length(allowed_mime_types, 1) as mime_types_count,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'meeting-files';

-- Check existing RLS policies for storage.objects
SELECT 
  policyname,
  cmd,
  roles::text,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%meeting%';

-- Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'; 
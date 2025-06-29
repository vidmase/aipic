-- Fixed Storage policies for reference-images bucket
-- Run this in Supabase SQL Editor

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own reference images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view reference images" ON storage.objects;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can upload their own files
-- File path format: reference-images/{user-id}/{filename}
CREATE POLICY "Users can upload their own reference images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'reference-images' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Policy 2: Users can view their own files  
CREATE POLICY "Users can view their own reference images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'reference-images'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete their own reference images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'reference-images'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Policy 4: Public read access for reference images (for sharing)
CREATE POLICY "Public can view reference images" ON storage.objects
FOR SELECT USING (bucket_id = 'reference-images');

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'; 
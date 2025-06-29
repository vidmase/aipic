-- Simple Storage policies for reference-images bucket (permissive for testing)
-- Run this in Supabase SQL Editor

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own reference images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view reference images" ON storage.objects;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Simple policy: Authenticated users can do everything in reference-images bucket
CREATE POLICY "Authenticated users can manage reference images" ON storage.objects
FOR ALL USING (
  bucket_id = 'reference-images' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'reference-images' 
  AND auth.role() = 'authenticated'
);

-- Public read access for reference images
CREATE POLICY "Public can view reference images" ON storage.objects
FOR SELECT USING (bucket_id = 'reference-images');

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'; 
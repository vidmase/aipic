-- Storage policies for reference-images bucket
-- Run this in Supabase SQL Editor

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can upload their own files
CREATE POLICY "Users can upload their own reference images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'reference-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can view their own files  
CREATE POLICY "Users can view their own reference images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'reference-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete their own reference images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'reference-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Public read access for reference images (optional - for public sharing)
CREATE POLICY "Public can view reference images" ON storage.objects
FOR SELECT USING (bucket_id = 'reference-images');

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'; 
-- Migration: Setup Storage for Item Images
-- Creates storage bucket and policies for uploading item images

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'item-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view all images (bucket is public)
CREATE POLICY "Anyone can view item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'item-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'item-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

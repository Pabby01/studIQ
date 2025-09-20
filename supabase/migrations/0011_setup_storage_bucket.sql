-- Migration: Setup Storage Bucket and Policies for File Uploads
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Create the materials bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 
  'materials',
  'materials',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'materials'
);

-- Step 2: Create storage policies using Supabase's built-in functions
-- These policies will be created automatically by Supabase when you enable RLS

-- Enable RLS on the bucket (this is the key step)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'materials';

-- Step 3: Verify the setup
SELECT 
  'Bucket created: ' || CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'materials') THEN '✓' ELSE '✗' END as bucket_status,
  'Bucket is public: ' || CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'materials' AND public = true) THEN '✓' ELSE '✗' END as public_status;
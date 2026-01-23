-- ================================================
-- PROCESS MAP IMAGE UPLOAD MIGRATION
-- ================================================
-- This migration adds support for process map images:
-- - Adds mapping_process_url column to projects table
-- - Creates project-images storage bucket with RLS policies
-- ================================================

-- ================================================
-- 1. ADD MAPPING_PROCESS_URL COLUMN TO PROJECTS
-- ================================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS mapping_process_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.mapping_process_url IS 'URL to the process map image stored in Supabase Storage';

-- ================================================
-- 2. CREATE STORAGE BUCKET FOR PROJECT IMAGES
-- ================================================
-- Run this in Supabase SQL Editor or via Dashboard Storage settings

-- Create the bucket (if using SQL - may need to do this via Dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-images',
    'project-images',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ================================================
-- 3. STORAGE RLS POLICIES
-- ================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for project images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their uploads" ON storage.objects;

-- Policy: Anyone can read/view images (public bucket)
CREATE POLICY "Public read access for project images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload project images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'project-images'
    AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can update images they uploaded
CREATE POLICY "Authenticated users can update their uploads"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'project-images'
    AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can delete images
CREATE POLICY "Authenticated users can delete their uploads"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'project-images'
    AND auth.role() = 'authenticated'
);

-- ================================================
-- 4. HELPER FUNCTION TO GET PUBLIC URL
-- ================================================
-- This is optional - you can also construct URLs in the frontend

CREATE OR REPLACE FUNCTION get_storage_public_url(bucket TEXT, path TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Returns the public URL for a storage object
    -- Replace 'your-project-ref' with your actual Supabase project reference
    RETURN 'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/' || bucket || '/' || path;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================
-- END OF MIGRATION
-- ================================================

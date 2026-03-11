-- =============================================================================
-- Supabase Migrations for Dashboard Customization & Profile Photo Upload
-- =============================================================================
-- Run these SQL commands in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- MIGRATION 1: Add dashboard_config column to profiles table
-- -----------------------------------------------------------------------------
-- This stores user's dashboard widget preferences (visibility, order)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{
  "widgets": [
    {"id": "1", "type": "activeProjects", "visible": true, "order": 0},
    {"id": "2", "type": "activeSprints", "visible": true, "order": 1},
    {"id": "3", "type": "teamMetrics", "visible": true, "order": 2},
    {"id": "4", "type": "actionItems", "visible": true, "order": 3},
    {"id": "5", "type": "productivityTrend", "visible": true, "order": 4},
    {"id": "6", "type": "teamWorkload", "visible": true, "order": 5},
    {"id": "7", "type": "activityOverview", "visible": true, "order": 6},
    {"id": "8", "type": "taskDistribution", "visible": true, "order": 7},
    {"id": "9", "type": "recentActivity", "visible": true, "order": 8}
  ],
  "layout": "default"
}'::jsonb;

-- -----------------------------------------------------------------------------
-- MIGRATION 2: Create avatars storage bucket for profile photos
-- -----------------------------------------------------------------------------
-- Note: If you already have an 'avatars' bucket, this will skip creation

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- MIGRATION 3: Storage policies for avatars bucket
-- -----------------------------------------------------------------------------
-- These policies control who can read, upload, update, and delete avatars

-- Allow public read access to all avatars
CREATE POLICY "Public Access for Avatars" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
-- The file path must start with their user ID (e.g., "user-id/avatar.jpg")
CREATE POLICY "Authenticated users can upload own avatar" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- VERIFICATION QUERIES (Optional - run to verify setup)
-- -----------------------------------------------------------------------------

-- Check if dashboard_config column was added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'dashboard_config';

-- Check if avatars bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Check storage policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%avatar%';

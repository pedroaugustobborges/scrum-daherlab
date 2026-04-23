-- =========================================================
-- Add strategic_planning field to projects
-- Run this in the Supabase SQL editor
-- =========================================================

-- 1. Add column (boolean, defaults to false = "Não")
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS strategic_planning BOOLEAN NOT NULL DEFAULT false;

-- 2. Explicitly set all existing projects to false ("Não")
UPDATE projects
SET strategic_planning = false;

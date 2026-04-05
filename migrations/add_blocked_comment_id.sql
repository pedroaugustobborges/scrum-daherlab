-- Migration: Add blocked_comment_id to tasks table
-- This column stores the reference to the comment that explains why a task was blocked
-- Run this migration in your Supabase SQL Editor

-- Add the blocked_comment_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS blocked_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_blocked_comment_id ON public.tasks(blocked_comment_id);

-- Add a comment explaining the column
COMMENT ON COLUMN public.tasks.blocked_comment_id IS 'Reference to the comment that explains why this task was blocked';

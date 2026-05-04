-- Migration: add on_hold_reason column to projects table
-- Run this in the Supabase SQL editor

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS on_hold_reason TEXT;

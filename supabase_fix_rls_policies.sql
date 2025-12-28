-- ================================================
-- FIX: Row Level Security Policies
-- ================================================
-- This script fixes RLS policies to ensure authenticated users can access data
-- Run this in the Supabase SQL Editor if you're getting permission errors
-- ================================================

-- 1. Check current user (for debugging)
-- Run this first to see your current auth status
SELECT
    auth.uid() as user_id,
    auth.role() as role,
    current_user as postgres_user;

-- 2. Fix tasks table policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

-- Allow all authenticated users to view all tasks
CREATE POLICY "Tasks are viewable by authenticated users"
    ON public.tasks FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow all authenticated users to create tasks
CREATE POLICY "Authenticated users can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update tasks
CREATE POLICY "Authenticated users can update tasks"
    ON public.tasks FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete tasks
CREATE POLICY "Authenticated users can delete tasks"
    ON public.tasks FOR DELETE
    USING (auth.role() = 'authenticated');

-- 3. Fix profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Allow all authenticated users to view all profiles
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 4. Fix projects table policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Projects are viewable by authenticated users"
    ON public.projects FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projects"
    ON public.projects FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projects"
    ON public.projects FOR DELETE
    USING (auth.role() = 'authenticated');

-- 5. Fix sprints table policies
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sprints are viewable by authenticated users" ON public.sprints;
DROP POLICY IF EXISTS "Authenticated users can create sprints" ON public.sprints;
DROP POLICY IF EXISTS "Authenticated users can update sprints" ON public.sprints;
DROP POLICY IF EXISTS "Authenticated users can delete sprints" ON public.sprints;

CREATE POLICY "Sprints are viewable by authenticated users"
    ON public.sprints FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create sprints"
    ON public.sprints FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sprints"
    ON public.sprints FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sprints"
    ON public.sprints FOR DELETE
    USING (auth.role() = 'authenticated');

-- 6. Fix teams table policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can delete teams" ON public.teams;

CREATE POLICY "Teams are viewable by authenticated users"
    ON public.teams FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create teams"
    ON public.teams FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update teams"
    ON public.teams FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete teams"
    ON public.teams FOR DELETE
    USING (auth.role() = 'authenticated');

-- 7. Fix subtasks table policies
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subtasks are viewable by authenticated users" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated users can create subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated users can update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated users can delete subtasks" ON public.subtasks;

CREATE POLICY "Subtasks are viewable by authenticated users"
    ON public.subtasks FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create subtasks"
    ON public.subtasks FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update subtasks"
    ON public.subtasks FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete subtasks"
    ON public.subtasks FOR DELETE
    USING (auth.role() = 'authenticated');

-- 8. Fix sprint_retrospectives table policies
ALTER TABLE public.sprint_retrospectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Retrospectives viewable by authenticated users" ON public.sprint_retrospectives;
DROP POLICY IF EXISTS "Authenticated users can create retrospectives" ON public.sprint_retrospectives;
DROP POLICY IF EXISTS "Authenticated users can update retrospectives" ON public.sprint_retrospectives;
DROP POLICY IF EXISTS "Authenticated users can delete retrospectives" ON public.sprint_retrospectives;

CREATE POLICY "Retrospectives viewable by authenticated users"
    ON public.sprint_retrospectives FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create retrospectives"
    ON public.sprint_retrospectives FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update retrospectives"
    ON public.sprint_retrospectives FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete retrospectives"
    ON public.sprint_retrospectives FOR DELETE
    USING (auth.role() = 'authenticated');

-- 9. Fix retrospective_items table policies
ALTER TABLE public.retrospective_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Retrospective items viewable by authenticated users" ON public.retrospective_items;
DROP POLICY IF EXISTS "Authenticated users can create retrospective items" ON public.retrospective_items;
DROP POLICY IF EXISTS "Authenticated users can update retrospective items" ON public.retrospective_items;
DROP POLICY IF EXISTS "Authenticated users can delete retrospective items" ON public.retrospective_items;

CREATE POLICY "Retrospective items viewable by authenticated users"
    ON public.retrospective_items FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create retrospective items"
    ON public.retrospective_items FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update retrospective items"
    ON public.retrospective_items FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete retrospective items"
    ON public.retrospective_items FOR DELETE
    USING (auth.role() = 'authenticated');

-- 10. Fix sprint_reviews table policies
ALTER TABLE public.sprint_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews viewable by authenticated users" ON public.sprint_reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.sprint_reviews;
DROP POLICY IF EXISTS "Authenticated users can update reviews" ON public.sprint_reviews;
DROP POLICY IF EXISTS "Authenticated users can delete reviews" ON public.sprint_reviews;

CREATE POLICY "Reviews viewable by authenticated users"
    ON public.sprint_reviews FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create reviews"
    ON public.sprint_reviews FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update reviews"
    ON public.sprint_reviews FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete reviews"
    ON public.sprint_reviews FOR DELETE
    USING (auth.role() = 'authenticated');

-- 11. Fix review_story_feedback table policies
ALTER TABLE public.review_story_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Review feedback viewable by authenticated users" ON public.review_story_feedback;
DROP POLICY IF EXISTS "Authenticated users can manage review feedback" ON public.review_story_feedback;

CREATE POLICY "Review feedback viewable by authenticated users"
    ON public.review_story_feedback FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage review feedback"
    ON public.review_story_feedback FOR ALL
    USING (auth.role() = 'authenticated');

-- 12. Fix team_members table policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members are viewable by authenticated users" ON public.team_members;
DROP POLICY IF EXISTS "Team members can be added by team creators" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave team or creators can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can manage team members" ON public.team_members;

CREATE POLICY "Team members are viewable by authenticated users"
    ON public.team_members FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage team members"
    ON public.team_members FOR ALL
    USING (auth.role() = 'authenticated');

-- 13. Fix comments table policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by authenticated users" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can manage comments" ON public.comments;

CREATE POLICY "Comments are viewable by authenticated users"
    ON public.comments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage comments"
    ON public.comments FOR ALL
    USING (auth.role() = 'authenticated');

-- 14. Fix activities table policies
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activities are viewable by authenticated users" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;

CREATE POLICY "Activities are viewable by authenticated users"
    ON public.activities FOR SELECT
    USING (auth.role() = 'authenticated');

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these to verify the policies are working

-- Check if you can see all tables
SELECT 'activities' as table_name, COUNT(*) as count FROM public.activities
UNION ALL
SELECT 'comments', COUNT(*) FROM public.comments
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'projects', COUNT(*) FROM public.projects
UNION ALL
SELECT 'retrospective_items', COUNT(*) FROM public.retrospective_items
UNION ALL
SELECT 'review_story_feedback', COUNT(*) FROM public.review_story_feedback
UNION ALL
SELECT 'sprint_retrospectives', COUNT(*) FROM public.sprint_retrospectives
UNION ALL
SELECT 'sprint_reviews', COUNT(*) FROM public.sprint_reviews
UNION ALL
SELECT 'sprints', COUNT(*) FROM public.sprints
UNION ALL
SELECT 'subtasks', COUNT(*) FROM public.subtasks
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'team_members', COUNT(*) FROM public.team_members
UNION ALL
SELECT 'teams', COUNT(*) FROM public.teams
ORDER BY table_name;

-- ================================================
-- END OF SCRIPT
-- ================================================

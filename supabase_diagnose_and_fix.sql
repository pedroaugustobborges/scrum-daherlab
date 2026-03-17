-- ================================================
-- DIAGNOSE AND FIX RLS POLICIES
-- ================================================
-- Run this in Supabase SQL Editor
-- ================================================

-- STEP 1: Check what tables exist
SELECT '=== EXISTING TABLES ===' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- STEP 2: Check current policies on tasks table
SELECT '=== CURRENT POLICIES ON TASKS ===' as info;
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks';

-- STEP 3: Check current policies on projects table
SELECT '=== CURRENT POLICIES ON PROJECTS ===' as info;
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'projects';

-- ================================================
-- STEP 4: NUCLEAR OPTION - Remove ALL policies and create simple ones
-- ================================================

-- TASKS TABLE - Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'tasks'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- PROJECTS TABLE - Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- ================================================
-- STEP 5: Create SIMPLE permissive policies
-- ================================================

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create single permissive policy for ALL operations on tasks
CREATE POLICY "Allow all for authenticated users"
    ON public.tasks
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create single permissive policy for ALL operations on projects
CREATE POLICY "Allow all for authenticated users"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ================================================
-- STEP 6: Apply same fix to other important tables
-- ================================================

-- SPRINTS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprints') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sprints'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.sprints', pol.policyname);
        END LOOP;

        ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.sprints FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed sprints table';
    END IF;
END $$;

-- TEAMS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.teams', pol.policyname);
        END LOOP;

        ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.teams FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed teams table';
    END IF;
END $$;

-- TEAM_MEMBERS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', pol.policyname);
        END LOOP;

        ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.team_members FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed team_members table';
    END IF;
END $$;

-- SUBTASKS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subtasks') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subtasks'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.subtasks', pol.policyname);
        END LOOP;

        ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.subtasks FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed subtasks table';
    END IF;
END $$;

-- COMMENTS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.comments', pol.policyname);
        END LOOP;

        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.comments FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed comments table';
    END IF;
END $$;

-- PROJECT_CONFIGURATION
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_configuration') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_configuration'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_configuration', pol.policyname);
        END LOOP;

        ALTER TABLE public.project_configuration ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.project_configuration FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed project_configuration table';
    END IF;
END $$;

-- PROJECT_TEAMS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_teams') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_teams'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_teams', pol.policyname);
        END LOOP;

        ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.project_teams FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed project_teams table';
    END IF;
END $$;

-- TASK_DEPENDENCIES
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_dependencies') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_dependencies'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.task_dependencies', pol.policyname);
        END LOOP;

        ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.task_dependencies FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed task_dependencies table';
    END IF;
END $$;

-- PROFILES (special - users can only update their own)
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
        END LOOP;

        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- Everyone can view profiles
        CREATE POLICY "Profiles viewable by all authenticated"
            ON public.profiles FOR SELECT TO authenticated
            USING (true);

        -- Users can insert their own profile
        CREATE POLICY "Users can insert own profile"
            ON public.profiles FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = id);

        -- Users can update their own profile
        CREATE POLICY "Users can update own profile"
            ON public.profiles FOR UPDATE TO authenticated
            USING (auth.uid() = id);

        RAISE NOTICE 'Fixed profiles table';
    END IF;
END $$;

-- ACTIVITIES
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.activities', pol.policyname);
        END LOOP;

        ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.activities FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed activities table';
    END IF;
END $$;

-- SPRINT_RETROSPECTIVES
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprint_retrospectives') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sprint_retrospectives'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.sprint_retrospectives', pol.policyname);
        END LOOP;

        ALTER TABLE public.sprint_retrospectives ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.sprint_retrospectives FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed sprint_retrospectives table';
    END IF;
END $$;

-- RETROSPECTIVE_ITEMS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retrospective_items') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'retrospective_items'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.retrospective_items', pol.policyname);
        END LOOP;

        ALTER TABLE public.retrospective_items ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.retrospective_items FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed retrospective_items table';
    END IF;
END $$;

-- SPRINT_REVIEWS
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprint_reviews') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sprint_reviews'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.sprint_reviews', pol.policyname);
        END LOOP;

        ALTER TABLE public.sprint_reviews ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.sprint_reviews FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed sprint_reviews table';
    END IF;
END $$;

-- REVIEW_STORY_FEEDBACK
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_story_feedback') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'review_story_feedback'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.review_story_feedback', pol.policyname);
        END LOOP;

        ALTER TABLE public.review_story_feedback ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all for authenticated users"
            ON public.review_story_feedback FOR ALL TO authenticated
            USING (true) WITH CHECK (true);

        RAISE NOTICE 'Fixed review_story_feedback table';
    END IF;
END $$;

-- ================================================
-- STEP 7: Verify the new policies
-- ================================================
SELECT '=== NEW POLICIES APPLIED ===' as info;
SELECT
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================
-- DONE!
-- ================================================
SELECT '=== MIGRATION COMPLETE ===' as info;
SELECT 'Please log out and log back in to refresh your session' as next_step;

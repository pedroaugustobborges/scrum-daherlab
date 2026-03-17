-- ================================================
-- FIX: PERMISSIONS FOR ALL AUTHENTICATED USERS
-- ================================================
-- This migration fixes RLS policies to ensure:
-- 1. Any authenticated user can create/update/delete tasks and user stories
-- 2. Admins OR creators can delete/update projects
-- 3. Proper access for all authenticated users
--
-- NOTE: This script safely handles missing tables
-- ================================================

-- First, let's create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_user_admin TO authenticated;

-- ================================================
-- FIX TASKS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON public.tasks;
        DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
        DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
        DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;
        DROP POLICY IF EXISTS "Task creators can delete tasks" ON public.tasks;

        -- Create new permissive policies
        CREATE POLICY "Tasks are viewable by authenticated users"
            ON public.tasks FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can create tasks"
            ON public.tasks FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can update tasks"
            ON public.tasks FOR UPDATE
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can delete tasks"
            ON public.tasks FOR DELETE
            USING (auth.role() = 'authenticated');

        RAISE NOTICE 'Fixed policies for tasks table';
    ELSE
        RAISE NOTICE 'Table tasks does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX PROJECTS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON public.projects;
        DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
        DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
        DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;
        DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
        DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
        DROP POLICY IF EXISTS "Admins or creators can update projects" ON public.projects;
        DROP POLICY IF EXISTS "Admins or creators can delete projects" ON public.projects;

        -- Create new policies (admins and creators can update/delete)
        CREATE POLICY "Projects are viewable by authenticated users"
            ON public.projects FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can create projects"
            ON public.projects FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Admins or creators can update projects"
            ON public.projects FOR UPDATE
            USING (
                auth.role() = 'authenticated' AND (
                    created_by = auth.uid() OR
                    public.is_user_admin()
                )
            );

        CREATE POLICY "Admins or creators can delete projects"
            ON public.projects FOR DELETE
            USING (
                auth.role() = 'authenticated' AND (
                    created_by = auth.uid() OR
                    public.is_user_admin()
                )
            );

        RAISE NOTICE 'Fixed policies for projects table';
    ELSE
        RAISE NOTICE 'Table projects does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX SPRINTS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprints') THEN
        ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Sprints are viewable by authenticated users" ON public.sprints;
        DROP POLICY IF EXISTS "Authenticated users can create sprints" ON public.sprints;
        DROP POLICY IF EXISTS "Authenticated users can update sprints" ON public.sprints;
        DROP POLICY IF EXISTS "Authenticated users can delete sprints" ON public.sprints;
        DROP POLICY IF EXISTS "Team members can update sprints" ON public.sprints;
        DROP POLICY IF EXISTS "Team members can delete sprints" ON public.sprints;

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

        RAISE NOTICE 'Fixed policies for sprints table';
    ELSE
        RAISE NOTICE 'Table sprints does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX SUBTASKS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subtasks') THEN
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

        RAISE NOTICE 'Fixed policies for subtasks table';
    ELSE
        RAISE NOTICE 'Table subtasks does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX TEAMS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
        ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON public.teams;
        DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
        DROP POLICY IF EXISTS "Authenticated users can update teams" ON public.teams;
        DROP POLICY IF EXISTS "Authenticated users can delete teams" ON public.teams;
        DROP POLICY IF EXISTS "Users can update own teams" ON public.teams;
        DROP POLICY IF EXISTS "Users can delete own teams" ON public.teams;

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

        RAISE NOTICE 'Fixed policies for teams table';
    ELSE
        RAISE NOTICE 'Table teams does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX TEAM_MEMBERS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
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

        RAISE NOTICE 'Fixed policies for team_members table';
    ELSE
        RAISE NOTICE 'Table team_members does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX COMMENTS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
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

        RAISE NOTICE 'Fixed policies for comments table';
    ELSE
        RAISE NOTICE 'Table comments does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX PROFILES TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
        DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

        CREATE POLICY "Profiles are viewable by authenticated users"
            ON public.profiles FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Users can update own profile"
            ON public.profiles FOR UPDATE
            USING (auth.uid() = id);

        CREATE POLICY "Users can insert own profile"
            ON public.profiles FOR INSERT
            WITH CHECK (auth.uid() = id);

        RAISE NOTICE 'Fixed policies for profiles table';
    ELSE
        RAISE NOTICE 'Table profiles does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX SPRINT_RETROSPECTIVES TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprint_retrospectives') THEN
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

        RAISE NOTICE 'Fixed policies for sprint_retrospectives table';
    ELSE
        RAISE NOTICE 'Table sprint_retrospectives does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX RETROSPECTIVE_ITEMS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retrospective_items') THEN
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

        RAISE NOTICE 'Fixed policies for retrospective_items table';
    ELSE
        RAISE NOTICE 'Table retrospective_items does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX SPRINT_REVIEWS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprint_reviews') THEN
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

        RAISE NOTICE 'Fixed policies for sprint_reviews table';
    ELSE
        RAISE NOTICE 'Table sprint_reviews does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX REVIEW_STORY_FEEDBACK TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_story_feedback') THEN
        ALTER TABLE public.review_story_feedback ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Review feedback viewable by authenticated users" ON public.review_story_feedback;
        DROP POLICY IF EXISTS "Authenticated users can manage review feedback" ON public.review_story_feedback;

        CREATE POLICY "Review feedback viewable by authenticated users"
            ON public.review_story_feedback FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can manage review feedback"
            ON public.review_story_feedback FOR ALL
            USING (auth.role() = 'authenticated');

        RAISE NOTICE 'Fixed policies for review_story_feedback table';
    ELSE
        RAISE NOTICE 'Table review_story_feedback does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX ACTIVITIES TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Activities are viewable by authenticated users" ON public.activities;
        DROP POLICY IF EXISTS "Activities can only be inserted by system" ON public.activities;
        DROP POLICY IF EXISTS "System can insert activities" ON public.activities;

        CREATE POLICY "Activities are viewable by authenticated users"
            ON public.activities FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "System can insert activities"
            ON public.activities FOR INSERT
            WITH CHECK (true);

        RAISE NOTICE 'Fixed policies for activities table';
    ELSE
        RAISE NOTICE 'Table activities does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX PROJECT_CONFIGURATION TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_configuration') THEN
        ALTER TABLE public.project_configuration ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Project config viewable by authenticated users" ON public.project_configuration;
        DROP POLICY IF EXISTS "Authenticated users can manage project config" ON public.project_configuration;

        CREATE POLICY "Project config viewable by authenticated users"
            ON public.project_configuration FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can manage project config"
            ON public.project_configuration FOR ALL
            USING (auth.role() = 'authenticated');

        RAISE NOTICE 'Fixed policies for project_configuration table';
    ELSE
        RAISE NOTICE 'Table project_configuration does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX PROJECT_TEAMS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_teams') THEN
        ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Project teams viewable by authenticated users" ON public.project_teams;
        DROP POLICY IF EXISTS "Authenticated users can manage project teams" ON public.project_teams;

        CREATE POLICY "Project teams viewable by authenticated users"
            ON public.project_teams FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can manage project teams"
            ON public.project_teams FOR ALL
            USING (auth.role() = 'authenticated');

        RAISE NOTICE 'Fixed policies for project_teams table';
    ELSE
        RAISE NOTICE 'Table project_teams does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX TASK_DEPENDENCIES TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_dependencies') THEN
        ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Task dependencies viewable by authenticated users" ON public.task_dependencies;
        DROP POLICY IF EXISTS "Authenticated users can manage task dependencies" ON public.task_dependencies;

        CREATE POLICY "Task dependencies viewable by authenticated users"
            ON public.task_dependencies FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can manage task dependencies"
            ON public.task_dependencies FOR ALL
            USING (auth.role() = 'authenticated');

        RAISE NOTICE 'Fixed policies for task_dependencies table';
    ELSE
        RAISE NOTICE 'Table task_dependencies does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX CALENDAR_SUBSCRIPTIONS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_subscriptions') THEN
        ALTER TABLE public.calendar_subscriptions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Calendar subscriptions viewable by authenticated users" ON public.calendar_subscriptions;
        DROP POLICY IF EXISTS "Authenticated users can manage calendar subscriptions" ON public.calendar_subscriptions;

        CREATE POLICY "Calendar subscriptions viewable by authenticated users"
            ON public.calendar_subscriptions FOR SELECT
            USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can manage calendar subscriptions"
            ON public.calendar_subscriptions FOR ALL
            USING (auth.role() = 'authenticated');

        RAISE NOTICE 'Fixed policies for calendar_subscriptions table';
    ELSE
        RAISE NOTICE 'Table calendar_subscriptions does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- FIX CALENDAR_FEED_TOKENS TABLE POLICIES (if exists)
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_feed_tokens') THEN
        ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Calendar feed tokens viewable by owner" ON public.calendar_feed_tokens;
        DROP POLICY IF EXISTS "Users can manage own calendar feed tokens" ON public.calendar_feed_tokens;

        CREATE POLICY "Calendar feed tokens viewable by owner"
            ON public.calendar_feed_tokens FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can manage own calendar feed tokens"
            ON public.calendar_feed_tokens FOR ALL
            USING (auth.uid() = user_id);

        RAISE NOTICE 'Fixed policies for calendar_feed_tokens table';
    ELSE
        RAISE NOTICE 'Table calendar_feed_tokens does not exist, skipping...';
    END IF;
END $$;

-- ================================================
-- SHOW EXISTING TABLES
-- ================================================
SELECT 'Existing tables in public schema:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ================================================
-- SHOW APPLIED POLICIES
-- ================================================
SELECT 'Applied RLS policies:' as info;
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================
-- END OF MIGRATION
-- ================================================

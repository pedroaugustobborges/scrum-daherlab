-- ================================================
-- PROPER RLS POLICIES WITH TEAM-BASED ACCESS
-- ================================================
-- Rules:
-- 1. Admins can see and do everything
-- 2. Non-admin users can only see/modify data for projects
--    where they are a member of a team associated with that project
-- ================================================

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user has access to a project
CREATE OR REPLACE FUNCTION public.user_has_project_access(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins have access to everything
    IF public.is_admin() THEN
        RETURN TRUE;
    END IF;

    -- Check if user is the creator
    IF EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = project_uuid AND created_by = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is a member of a team associated with the project
    IF EXISTS (
        SELECT 1 FROM public.project_teams pt
        INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
        WHERE pt.project_id = project_uuid AND tm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Fallback: Projects with no teams assigned are visible to all authenticated users
    -- (This handles legacy/unassigned projects)
    IF NOT EXISTS (
        SELECT 1 FROM public.project_teams WHERE project_id = project_uuid
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_project_access TO authenticated;

-- ================================================
-- PROJECTS TABLE POLICIES
-- ================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all existing policies
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    END LOOP;

    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    -- SELECT: Users can see projects they have access to
    CREATE POLICY "Users can view accessible projects"
        ON public.projects FOR SELECT TO authenticated
        USING (public.user_has_project_access(id));

    -- INSERT: Any authenticated user can create projects
    CREATE POLICY "Authenticated users can create projects"
        ON public.projects FOR INSERT TO authenticated
        WITH CHECK (true);

    -- UPDATE: Admins or creators can update
    CREATE POLICY "Admins or creators can update projects"
        ON public.projects FOR UPDATE TO authenticated
        USING (public.is_admin() OR created_by = auth.uid());

    -- DELETE: Admins or creators can delete
    CREATE POLICY "Admins or creators can delete projects"
        ON public.projects FOR DELETE TO authenticated
        USING (public.is_admin() OR created_by = auth.uid());

    RAISE NOTICE 'Fixed projects policies';
END $$;

-- ================================================
-- TASKS TABLE POLICIES
-- ================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
        END LOOP;

        ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

        -- SELECT: Users can see tasks for projects they have access to
        CREATE POLICY "Users can view tasks of accessible projects"
            ON public.tasks FOR SELECT TO authenticated
            USING (public.user_has_project_access(project_id));

        -- INSERT: Users can create tasks in projects they have access to
        CREATE POLICY "Users can create tasks in accessible projects"
            ON public.tasks FOR INSERT TO authenticated
            WITH CHECK (public.user_has_project_access(project_id));

        -- UPDATE: Users can update tasks in projects they have access to
        CREATE POLICY "Users can update tasks in accessible projects"
            ON public.tasks FOR UPDATE TO authenticated
            USING (public.user_has_project_access(project_id));

        -- DELETE: Any team member with project access can delete tasks
        CREATE POLICY "Users can delete tasks in accessible projects"
            ON public.tasks FOR DELETE TO authenticated
            USING (public.user_has_project_access(project_id));

        RAISE NOTICE 'Fixed tasks policies';
    END IF;
END $$;

-- ================================================
-- SPRINTS TABLE POLICIES
-- ================================================
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

        -- SELECT: Users can see sprints for projects they have access to
        CREATE POLICY "Users can view sprints of accessible projects"
            ON public.sprints FOR SELECT TO authenticated
            USING (public.user_has_project_access(project_id));

        -- INSERT: Users can create sprints in accessible projects
        CREATE POLICY "Users can create sprints in accessible projects"
            ON public.sprints FOR INSERT TO authenticated
            WITH CHECK (public.user_has_project_access(project_id));

        -- UPDATE: Users can update sprints in accessible projects
        CREATE POLICY "Users can update sprints in accessible projects"
            ON public.sprints FOR UPDATE TO authenticated
            USING (public.user_has_project_access(project_id));

        -- DELETE: Admins or sprint creators can delete
        CREATE POLICY "Admins or creators can delete sprints"
            ON public.sprints FOR DELETE TO authenticated
            USING (public.is_admin() OR created_by = auth.uid());

        RAISE NOTICE 'Fixed sprints policies';
    END IF;
END $$;

-- ================================================
-- TEAMS TABLE POLICIES
-- ================================================
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

        -- SELECT: Users can see teams they are members of (or admins see all)
        CREATE POLICY "Users can view their teams"
            ON public.teams FOR SELECT TO authenticated
            USING (
                public.is_admin() OR
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.team_members
                    WHERE team_id = id AND user_id = auth.uid()
                )
            );

        -- INSERT: Any authenticated user can create teams
        CREATE POLICY "Authenticated users can create teams"
            ON public.teams FOR INSERT TO authenticated
            WITH CHECK (true);

        -- UPDATE: Admins or team creators can update
        CREATE POLICY "Admins or creators can update teams"
            ON public.teams FOR UPDATE TO authenticated
            USING (public.is_admin() OR created_by = auth.uid());

        -- DELETE: Admins or team creators can delete
        CREATE POLICY "Admins or creators can delete teams"
            ON public.teams FOR DELETE TO authenticated
            USING (public.is_admin() OR created_by = auth.uid());

        RAISE NOTICE 'Fixed teams policies';
    END IF;
END $$;

-- ================================================
-- TEAM_MEMBERS TABLE POLICIES
-- ================================================
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

        -- SELECT: Users can see team members of teams they belong to
        CREATE POLICY "Users can view team members"
            ON public.team_members FOR SELECT TO authenticated
            USING (
                public.is_admin() OR
                EXISTS (
                    SELECT 1 FROM public.team_members tm
                    WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.teams
                    WHERE id = team_id AND created_by = auth.uid()
                )
            );

        -- INSERT/UPDATE/DELETE: Admins or team creators
        CREATE POLICY "Admins or team creators can manage members"
            ON public.team_members FOR ALL TO authenticated
            USING (
                public.is_admin() OR
                EXISTS (
                    SELECT 1 FROM public.teams
                    WHERE id = team_id AND created_by = auth.uid()
                )
            );

        RAISE NOTICE 'Fixed team_members policies';
    END IF;
END $$;

-- ================================================
-- PROJECT_TEAMS TABLE POLICIES
-- ================================================
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

        -- SELECT: Users can see project_teams for accessible projects
        CREATE POLICY "Users can view project teams"
            ON public.project_teams FOR SELECT TO authenticated
            USING (public.user_has_project_access(project_id));

        -- INSERT/UPDATE/DELETE: Admins or project creators
        CREATE POLICY "Admins or project creators can manage project teams"
            ON public.project_teams FOR ALL TO authenticated
            USING (
                public.is_admin() OR
                EXISTS (
                    SELECT 1 FROM public.projects
                    WHERE id = project_id AND created_by = auth.uid()
                )
            );

        RAISE NOTICE 'Fixed project_teams policies';
    END IF;
END $$;

-- ================================================
-- PROFILES TABLE POLICIES (keep simple)
-- ================================================
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

        -- All authenticated users can view profiles (needed for displaying names)
        CREATE POLICY "Profiles viewable by authenticated users"
            ON public.profiles FOR SELECT TO authenticated
            USING (true);

        CREATE POLICY "Users can insert own profile"
            ON public.profiles FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = id);

        CREATE POLICY "Users can update own profile"
            ON public.profiles FOR UPDATE TO authenticated
            USING (auth.uid() = id);

        RAISE NOTICE 'Fixed profiles policies';
    END IF;
END $$;

-- ================================================
-- OTHER TABLES - Keep permissive for project-related data
-- ================================================

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

        -- Subtasks inherit access from their parent task's project
        CREATE POLICY "Users can manage subtasks of accessible tasks"
            ON public.subtasks FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.tasks t
                    WHERE t.id = task_id AND public.user_has_project_access(t.project_id)
                )
            );

        RAISE NOTICE 'Fixed subtasks policies';
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

        CREATE POLICY "Users can view comments of accessible tasks"
            ON public.comments FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.tasks t
                    WHERE t.id = task_id AND public.user_has_project_access(t.project_id)
                )
            );

        CREATE POLICY "Users can create comments on accessible tasks"
            ON public.comments FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.tasks t
                    WHERE t.id = task_id AND public.user_has_project_access(t.project_id)
                )
            );

        CREATE POLICY "Users can update own comments"
            ON public.comments FOR UPDATE TO authenticated
            USING (user_id = auth.uid());

        CREATE POLICY "Users can delete own comments"
            ON public.comments FOR DELETE TO authenticated
            USING (user_id = auth.uid() OR public.is_admin());

        RAISE NOTICE 'Fixed comments policies';
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

        CREATE POLICY "Users can view config of accessible projects"
            ON public.project_configuration FOR SELECT TO authenticated
            USING (public.user_has_project_access(project_id));

        CREATE POLICY "Users can manage config of accessible projects"
            ON public.project_configuration FOR ALL TO authenticated
            USING (public.user_has_project_access(project_id));

        RAISE NOTICE 'Fixed project_configuration policies';
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

        -- Activities viewable by all authenticated (they show user activity)
        CREATE POLICY "Activities viewable by authenticated"
            ON public.activities FOR SELECT TO authenticated
            USING (true);

        CREATE POLICY "System can insert activities"
            ON public.activities FOR INSERT TO authenticated
            WITH CHECK (true);

        RAISE NOTICE 'Fixed activities policies';
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

        CREATE POLICY "Users can manage retrospectives of accessible sprints"
            ON public.sprint_retrospectives FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.sprints s
                    WHERE s.id = sprint_id AND public.user_has_project_access(s.project_id)
                )
            );

        RAISE NOTICE 'Fixed sprint_retrospectives policies';
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

        CREATE POLICY "Users can manage retrospective items"
            ON public.retrospective_items FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.sprint_retrospectives sr
                    JOIN public.sprints s ON s.id = sr.sprint_id
                    WHERE sr.id = retrospective_id AND public.user_has_project_access(s.project_id)
                )
            );

        RAISE NOTICE 'Fixed retrospective_items policies';
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

        CREATE POLICY "Users can manage reviews of accessible sprints"
            ON public.sprint_reviews FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.sprints s
                    WHERE s.id = sprint_id AND public.user_has_project_access(s.project_id)
                )
            );

        RAISE NOTICE 'Fixed sprint_reviews policies';
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

        CREATE POLICY "Users can manage review feedback"
            ON public.review_story_feedback FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.sprint_reviews sr
                    JOIN public.sprints s ON s.id = sr.sprint_id
                    WHERE sr.id = review_id AND public.user_has_project_access(s.project_id)
                )
            );

        RAISE NOTICE 'Fixed review_story_feedback policies';
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

        CREATE POLICY "Users can manage task dependencies"
            ON public.task_dependencies FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.tasks t
                    WHERE (t.id = predecessor_id OR t.id = successor_id)
                    AND public.user_has_project_access(t.project_id)
                )
            );

        RAISE NOTICE 'Fixed task_dependencies policies';
    END IF;
END $$;

-- ================================================
-- VERIFICATION
-- ================================================
SELECT '=== POLICIES APPLIED ===' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT '=== DONE! ===' as info;
SELECT 'Non-admin users will now only see projects they are members of' as result;

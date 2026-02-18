-- ================================================
-- FIX: Project CRUD Permissions
-- ================================================
-- Regular users can only CRUD projects where they
-- are a member of a team responsible for the project.
-- Admins can CRUD all projects.
-- ================================================

-- ================================================
-- STEP 1: DROP ALL DEPENDENT POLICIES
-- ================================================

-- Drop policies on projects table
DROP POLICY IF EXISTS "Projects viewable by team members or creators" ON public.projects;
DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Drop policies on sprints table that use user_has_project_access
DROP POLICY IF EXISTS "Users can create sprints for accessible projects" ON public.sprints;

-- Drop policies on tasks table that use user_has_project_access
DROP POLICY IF EXISTS "Users can create tasks for accessible projects" ON public.tasks;

-- ================================================
-- STEP 2: DROP THE FUNCTION
-- ================================================

DROP FUNCTION IF EXISTS user_has_project_access(UUID);

-- ================================================
-- STEP 3: CREATE NEW FUNCTION
-- ================================================
-- Used by sprints and tasks policies

CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_user_admin BOOLEAN;
BEGIN
    -- Check if user is admin (admins can access all projects)
    SELECT is_admin INTO is_user_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(is_user_admin, FALSE) THEN
        RETURN TRUE;
    END IF;

    -- User is a member of a team associated with the project
    RETURN EXISTS (
        SELECT 1 FROM public.project_teams pt
        INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
        WHERE pt.project_id = project_uuid AND tm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ================================================
-- STEP 4: PROJECT SELECT POLICY
-- ================================================
-- Users can see projects where they are a member of a responsible team
-- Exception: Creator can see during creation (before teams are assigned)

CREATE POLICY "Projects viewable by team members"
    ON public.projects FOR SELECT
    USING (
        -- Admins can see all projects
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
        OR
        -- Creator can see project during creation flow (no teams assigned yet)
        (
            created_by = auth.uid()
            AND NOT EXISTS (
                SELECT 1 FROM public.project_teams pt
                WHERE pt.project_id = projects.id
            )
        )
        OR
        -- User is a member of a team responsible for the project
        EXISTS (
            SELECT 1 FROM public.project_teams pt
            INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
            WHERE pt.project_id = projects.id AND tm.user_id = auth.uid()
        )
    );

-- ================================================
-- STEP 5: PROJECT INSERT POLICY
-- ================================================
-- Users must be a member of at least one team to create projects

CREATE POLICY "Team members can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        -- Admins can create projects
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
        OR
        -- User must be a member of at least one team
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE user_id = auth.uid()
        )
    );

-- ================================================
-- STEP 6: PROJECT UPDATE POLICY
-- ================================================
-- Users can only update projects where they are a member of a responsible team

CREATE POLICY "Team members can update projects"
    ON public.projects FOR UPDATE
    USING (
        -- Admins can update all projects
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
        OR
        -- User is a member of a team responsible for the project
        EXISTS (
            SELECT 1 FROM public.project_teams pt
            INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
            WHERE pt.project_id = projects.id AND tm.user_id = auth.uid()
        )
    );

-- ================================================
-- STEP 7: PROJECT DELETE POLICY
-- ================================================
-- Users can only delete projects where they are a member of a responsible team

CREATE POLICY "Team members can delete projects"
    ON public.projects FOR DELETE
    USING (
        -- Admins can delete all projects
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
        OR
        -- User is a member of a team responsible for the project
        EXISTS (
            SELECT 1 FROM public.project_teams pt
            INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
            WHERE pt.project_id = projects.id AND tm.user_id = auth.uid()
        )
    );

-- ================================================
-- STEP 8: RECREATE SPRINTS INSERT POLICY
-- ================================================

CREATE POLICY "Users can create sprints for accessible projects"
    ON public.sprints FOR INSERT
    WITH CHECK (
        -- Admins can create sprints for any project
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
        OR
        -- Users can create sprints for projects they have access to
        (
            project_id IS NULL
            OR
            user_has_project_access(project_id)
        )
    );

-- ================================================
-- STEP 9: RECREATE TASKS INSERT POLICY
-- ================================================

CREATE POLICY "Users can create tasks for accessible projects"
    ON public.tasks FOR INSERT
    WITH CHECK (
        -- Admins can create tasks for any project
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
        OR
        -- Users can create tasks for projects they have access to
        user_has_project_access(project_id)
    );

-- ================================================
-- STEP 10: VERIFICATION
-- ================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'projects'
ORDER BY cmd;

-- ================================================
-- END OF FIX
-- ================================================

-- ================================================
-- SPRINT AND TASK ACCESS CONTROL MIGRATION
-- ================================================
-- This migration restricts sprints and tasks visibility
-- based on project team membership
-- ================================================

-- ================================================
-- 1. CREATE HELPER FUNCTION FOR SPRINT ACCESS
-- ================================================

CREATE OR REPLACE FUNCTION user_has_sprint_access(sprint_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_user_admin BOOLEAN;
    sprint_project_id UUID;
BEGIN
    -- Check if user is admin (admins can see all sprints)
    SELECT is_admin INTO is_user_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(is_user_admin, FALSE) THEN
        RETURN TRUE;
    END IF;

    -- Get the project_id for this sprint
    SELECT project_id INTO sprint_project_id
    FROM public.sprints
    WHERE id = sprint_uuid;

    -- If sprint has no project, check if user created it
    IF sprint_project_id IS NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM public.sprints
            WHERE id = sprint_uuid AND created_by = auth.uid()
        );
    END IF;

    -- Check if user is the creator of the sprint
    IF EXISTS (
        SELECT 1 FROM public.sprints
        WHERE id = sprint_uuid AND created_by = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is a member of a team associated with the sprint's project
    IF EXISTS (
        SELECT 1 FROM public.project_teams pt
        INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
        WHERE pt.project_id = sprint_project_id AND tm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is a member of the sprint's team directly
    IF EXISTS (
        SELECT 1 FROM public.sprints s
        INNER JOIN public.team_members tm ON tm.team_id = s.team_id
        WHERE s.id = sprint_uuid AND tm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- No access
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 2. CREATE HELPER FUNCTION FOR TASK ACCESS
-- ================================================

CREATE OR REPLACE FUNCTION user_has_task_access(task_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_user_admin BOOLEAN;
    task_project_id UUID;
BEGIN
    -- Check if user is admin (admins can see all tasks)
    SELECT is_admin INTO is_user_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(is_user_admin, FALSE) THEN
        RETURN TRUE;
    END IF;

    -- Get the project_id for this task
    SELECT project_id INTO task_project_id
    FROM public.tasks
    WHERE id = task_uuid;

    -- If task has no project, check if user created it
    IF task_project_id IS NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = task_uuid AND created_by = auth.uid()
        );
    END IF;

    -- Check if user is the creator of the task
    IF EXISTS (
        SELECT 1 FROM public.tasks
        WHERE id = task_uuid AND created_by = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is assigned to the task
    IF EXISTS (
        SELECT 1 FROM public.tasks
        WHERE id = task_uuid AND assigned_to = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is a member of a team associated with the task's project
    IF EXISTS (
        SELECT 1 FROM public.project_teams pt
        INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
        WHERE pt.project_id = task_project_id AND tm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- No access
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 3. UPDATE SPRINTS RLS POLICIES
-- ================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Sprints are viewable by authenticated users" ON public.sprints;

-- Create new SELECT policy using the helper function
CREATE POLICY "Sprints viewable by project team members"
    ON public.sprints FOR SELECT
    USING (user_has_sprint_access(id));

-- Update INSERT policy - users can only create sprints for projects they have access to
DROP POLICY IF EXISTS "Authenticated users can create sprints" ON public.sprints;

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

-- Update UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update sprints" ON public.sprints;
DROP POLICY IF EXISTS "Team members can update sprints" ON public.sprints;

CREATE POLICY "Users can update accessible sprints"
    ON public.sprints FOR UPDATE
    USING (user_has_sprint_access(id));

-- Update DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete sprints" ON public.sprints;
DROP POLICY IF EXISTS "Team members can delete sprints" ON public.sprints;

CREATE POLICY "Users can delete accessible sprints"
    ON public.sprints FOR DELETE
    USING (user_has_sprint_access(id));

-- ================================================
-- 4. UPDATE TASKS RLS POLICIES
-- ================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON public.tasks;

-- Create new SELECT policy using the helper function
CREATE POLICY "Tasks viewable by project team members"
    ON public.tasks FOR SELECT
    USING (user_has_task_access(id));

-- Update INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;

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

-- Update UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;

CREATE POLICY "Users can update accessible tasks"
    ON public.tasks FOR UPDATE
    USING (user_has_task_access(id));

-- Update DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators can delete tasks" ON public.tasks;

CREATE POLICY "Users can delete accessible tasks"
    ON public.tasks FOR DELETE
    USING (user_has_task_access(id));

-- ================================================
-- 5. COMMENTS
-- ================================================

COMMENT ON FUNCTION user_has_sprint_access IS 'Checks if current user has access to a sprint through project team membership, direct team membership, or ownership';
COMMENT ON FUNCTION user_has_task_access IS 'Checks if current user has access to a task through project team membership, assignment, or ownership';

-- ================================================
-- END OF MIGRATION
-- ================================================

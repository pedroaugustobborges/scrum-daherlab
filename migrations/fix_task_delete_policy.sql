-- ================================================
-- FIX: Allow team members to delete tasks
-- ================================================
-- Problem: Only admins, task creators, and project creators could delete tasks
-- Solution: Allow any team member with project access to delete tasks
-- ================================================

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

-- Create new delete policy that allows team members to delete tasks
-- This uses the same logic as UPDATE - anyone with project access can delete
CREATE POLICY "Users can delete tasks in accessible projects"
    ON public.tasks FOR DELETE TO authenticated
    USING (public.user_has_project_access(project_id));

-- Verify the policy was created
SELECT 'Task delete policy updated successfully!' as result;
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks';

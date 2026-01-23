-- ================================================
-- PROJECT TEAMS MIGRATION
-- ================================================
-- This migration adds the project_teams junction table
-- and updates RLS policies for project access control
-- ================================================

-- 1. Create the project_teams junction table
CREATE TABLE IF NOT EXISTS public.project_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(project_id, team_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON public.project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_team_id ON public.project_teams(team_id);

-- 3. Enable RLS on project_teams
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for project_teams
-- Allow authenticated users to view project-team associations
CREATE POLICY "Project teams viewable by authenticated users"
    ON public.project_teams FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage project-team associations
CREATE POLICY "Authenticated users can manage project teams"
    ON public.project_teams FOR ALL
    USING (auth.role() = 'authenticated');

-- ================================================
-- 5. UPDATE PROJECT RLS POLICIES
-- ================================================
-- Update the projects SELECT policy to only show projects where:
-- - User is the creator of the project, OR
-- - User is a member of a team associated with the project
-- ================================================

-- First, drop the existing SELECT policy
DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON public.projects;

-- Create a helper function to check if user has access to project
CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        -- User is the creator
        SELECT 1 FROM public.projects
        WHERE id = project_uuid AND created_by = auth.uid()
    ) OR EXISTS (
        -- User is a member of a team associated with the project
        SELECT 1 FROM public.project_teams pt
        INNER JOIN public.team_members tm ON tm.team_id = pt.team_id
        WHERE pt.project_id = project_uuid AND tm.user_id = auth.uid()
    ) OR EXISTS (
        -- Fallback: Project has no teams assigned (legacy/unassigned projects visible to all)
        SELECT 1 FROM public.projects p
        WHERE p.id = project_uuid
        AND NOT EXISTS (
            SELECT 1 FROM public.project_teams pt WHERE pt.project_id = p.id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new SELECT policy using the helper function
CREATE POLICY "Projects viewable by team members or creators"
    ON public.projects FOR SELECT
    USING (user_has_project_access(id));

-- ================================================
-- 6. COMMENTS
-- ================================================
COMMENT ON TABLE public.project_teams IS 'Junction table linking projects to responsible teams';
COMMENT ON FUNCTION user_has_project_access IS 'Checks if current user has access to a project through team membership or ownership';

-- ================================================
-- 7. VERIFICATION QUERIES
-- ================================================
-- Run these to verify the migration was successful

-- Check if table was created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_teams';

-- Check policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('projects', 'project_teams');

-- ================================================
-- END OF MIGRATION
-- ================================================

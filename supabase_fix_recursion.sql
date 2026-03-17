-- ================================================
-- FIX: Infinite Recursion in team_members and teams policies
-- ================================================

-- Fix TEAMS policy (avoid recursion)
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

        -- Simple policy: all authenticated users can view teams
        -- (Team visibility is controlled at the project level)
        CREATE POLICY "Authenticated users can view teams"
            ON public.teams FOR SELECT TO authenticated
            USING (true);

        CREATE POLICY "Authenticated users can create teams"
            ON public.teams FOR INSERT TO authenticated
            WITH CHECK (true);

        CREATE POLICY "Admins or creators can update teams"
            ON public.teams FOR UPDATE TO authenticated
            USING (public.is_admin() OR created_by = auth.uid());

        CREATE POLICY "Admins or creators can delete teams"
            ON public.teams FOR DELETE TO authenticated
            USING (public.is_admin() OR created_by = auth.uid());

        RAISE NOTICE 'Fixed teams policies';
    END IF;
END $$;

-- Fix TEAM_MEMBERS policy (avoid self-reference recursion)
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

        -- Simple policy: all authenticated users can view team members
        -- This avoids recursion and team membership visibility is not sensitive
        CREATE POLICY "Authenticated users can view team members"
            ON public.team_members FOR SELECT TO authenticated
            USING (true);

        -- INSERT: Admins or team creators can add members
        CREATE POLICY "Admins or team creators can add members"
            ON public.team_members FOR INSERT TO authenticated
            WITH CHECK (
                public.is_admin() OR
                EXISTS (
                    SELECT 1 FROM public.teams
                    WHERE id = team_id AND created_by = auth.uid()
                )
            );

        -- UPDATE: Admins or team creators can update
        CREATE POLICY "Admins or team creators can update members"
            ON public.team_members FOR UPDATE TO authenticated
            USING (
                public.is_admin() OR
                EXISTS (
                    SELECT 1 FROM public.teams
                    WHERE id = team_id AND created_by = auth.uid()
                )
            );

        -- DELETE: Admins, team creators, or user removing themselves
        CREATE POLICY "Admins team creators or self can remove"
            ON public.team_members FOR DELETE TO authenticated
            USING (
                public.is_admin() OR
                user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.teams
                    WHERE id = team_id AND created_by = auth.uid()
                )
            );

        RAISE NOTICE 'Fixed team_members policies';
    END IF;
END $$;

-- Verify
SELECT 'Fixed policies:' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('teams', 'team_members')
ORDER BY tablename, policyname;

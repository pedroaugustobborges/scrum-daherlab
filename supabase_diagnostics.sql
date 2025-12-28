-- ================================================
-- DIAGNOSTICS: Check Database State
-- ================================================
-- Run this to diagnose issues with your database
-- ================================================

-- 1. Check if user is authenticated
SELECT
    auth.uid() as current_user_id,
    auth.role() as current_role,
    CASE
        WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED'
        ELSE 'AUTHENTICATED'
    END as auth_status;

-- 2. Check if tables exist
SELECT
    table_name,
    'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('tasks', 'subtasks', 'profiles', 'projects', 'sprints', 'teams',
                       'sprint_retrospectives', 'retrospective_items', 'sprint_reviews')
ORDER BY table_name;

-- 3. Check if order_index column exists in tasks table
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'tasks'
    AND column_name = 'order_index';

-- 4. Check if completed_at column exists in tasks table
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'tasks'
    AND column_name = 'completed_at';

-- 5. Check RLS status for each table
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('tasks', 'subtasks', 'profiles', 'projects', 'sprints', 'teams',
                      'sprint_retrospectives', 'retrospective_items', 'sprint_reviews')
ORDER BY tablename;

-- 6. Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Check data counts
SELECT 'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'projects', COUNT(*) FROM public.projects
UNION ALL
SELECT 'sprints', COUNT(*) FROM public.sprints
UNION ALL
SELECT 'teams', COUNT(*) FROM public.teams
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'subtasks', COUNT(*) FROM public.subtasks
UNION ALL
SELECT 'sprint_retrospectives', COUNT(*) FROM public.sprint_retrospectives
UNION ALL
SELECT 'retrospective_items', COUNT(*) FROM public.retrospective_items
UNION ALL
SELECT 'sprint_reviews', COUNT(*) FROM public.sprint_reviews;

-- 8. Check if there are any tasks
SELECT
    id,
    title,
    status,
    sprint_id,
    project_id,
    order_index,
    created_at
FROM public.tasks
ORDER BY created_at DESC
LIMIT 5;

-- 9. Check if there are any profiles
SELECT
    id,
    full_name,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 10. Check triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table IN ('tasks', 'subtasks', 'sprint_retrospectives', 'retrospective_items', 'sprint_reviews')
ORDER BY event_object_table, trigger_name;

-- ================================================
-- END OF DIAGNOSTICS
-- ================================================

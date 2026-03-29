-- ================================================
-- MIGRATION: Sprint Auto-Naming System
-- ================================================
-- This migration adds backend support for automatic sprint naming
-- with the "Sprint de Kick Off" / "Sprint N" convention
-- Execute this in the Supabase SQL Editor
-- ================================================

-- 1. Function to count existing sprints for a team/project
CREATE OR REPLACE FUNCTION get_sprint_count(
    p_team_id UUID,
    p_project_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    sprint_count INTEGER;
BEGIN
    IF p_project_id IS NOT NULL THEN
        SELECT COUNT(*) INTO sprint_count
        FROM public.sprints
        WHERE project_id = p_project_id;
    ELSE
        SELECT COUNT(*) INTO sprint_count
        FROM public.sprints
        WHERE team_id = p_team_id;
    END IF;

    RETURN COALESCE(sprint_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to generate the sprint name prefix
CREATE OR REPLACE FUNCTION generate_sprint_name_prefix(
    p_team_id UUID,
    p_project_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    sprint_count INTEGER;
BEGIN
    sprint_count := get_sprint_count(p_team_id, p_project_id);

    IF sprint_count = 0 THEN
        RETURN 'Sprint de Kick Off';
    ELSE
        RETURN 'Sprint ' || (sprint_count + 1)::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to generate the full sprint name
CREATE OR REPLACE FUNCTION generate_sprint_name(
    p_team_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_user_title TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    full_name TEXT;
BEGIN
    prefix := generate_sprint_name_prefix(p_team_id, p_project_id);

    IF p_user_title IS NOT NULL AND TRIM(p_user_title) <> '' THEN
        full_name := prefix || ' - ' || TRIM(p_user_title);
    ELSE
        full_name := prefix;
    END IF;

    RETURN full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get the last retrospective insights for Ada
CREATE OR REPLACE FUNCTION get_last_retrospective_insights(
    p_team_id UUID,
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
    sprint_name TEXT,
    mood_rating INTEGER,
    improvement_count BIGINT,
    action_count BIGINT,
    pending_action_count BIGINT,
    top_improvements TEXT[],
    pending_actions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH last_sprint AS (
        SELECT s.id, s.name
        FROM public.sprints s
        WHERE s.status = 'completed'
            AND (
                (p_project_id IS NOT NULL AND s.project_id = p_project_id)
                OR (p_project_id IS NULL AND s.team_id = p_team_id)
            )
        ORDER BY s.end_date DESC
        LIMIT 1
    ),
    retro AS (
        SELECT sr.id, sr.mood_rating, ls.name AS sprint_name
        FROM public.sprint_retrospectives sr
        JOIN last_sprint ls ON sr.sprint_id = ls.id
    ),
    items AS (
        SELECT
            ri.category,
            ri.content,
            ri.status,
            ri.votes
        FROM public.retrospective_items ri
        JOIN retro r ON ri.retrospective_id = r.id
    )
    SELECT
        (SELECT r.sprint_name FROM retro r LIMIT 1),
        (SELECT r.mood_rating FROM retro r LIMIT 1),
        COUNT(*) FILTER (WHERE items.category = 'to_improve'),
        COUNT(*) FILTER (WHERE items.category = 'action_item'),
        COUNT(*) FILTER (WHERE items.category = 'action_item' AND items.status IN ('pending', 'in_progress')),
        ARRAY(
            SELECT items.content
            FROM items
            WHERE items.category = 'to_improve'
            ORDER BY items.votes DESC
            LIMIT 3
        ),
        ARRAY(
            SELECT items.content
            FROM items
            WHERE items.category = 'action_item' AND items.status IN ('pending', 'in_progress')
            ORDER BY items.votes DESC
            LIMIT 3
        )
    FROM items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add comments
COMMENT ON FUNCTION get_sprint_count(UUID, UUID) IS 'Returns the count of sprints for a team or project';
COMMENT ON FUNCTION generate_sprint_name_prefix(UUID, UUID) IS 'Generates the automatic sprint name prefix (Kick Off or Sprint N)';
COMMENT ON FUNCTION generate_sprint_name(UUID, UUID, TEXT) IS 'Generates the full sprint name with prefix and optional user title';
COMMENT ON FUNCTION get_last_retrospective_insights(UUID, UUID) IS 'Returns insights from the last completed sprint retrospective for Ada';

-- ================================================
-- END OF MIGRATION
-- ================================================

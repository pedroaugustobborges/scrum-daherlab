-- ================================================
-- MIGRATION: Add automatic completed_at tracking
-- ================================================
-- This migration adds automatic tracking of task completion dates
-- Execute this in the Supabase SQL Editor
-- ================================================

-- 1. Function to automatically set completed_at when task is marked as done
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to 'done' and completed_at is null, set it
    IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.completed_at IS NULL THEN
        NEW.completed_at = TIMEZONE('utc', NOW());
    END IF;

    -- If status changed from 'done' to something else, clear completed_at
    IF NEW.status != 'done' AND OLD.status = 'done' THEN
        NEW.completed_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger on tasks table
DROP TRIGGER IF EXISTS trigger_update_task_completed_at ON public.tasks;
CREATE TRIGGER trigger_update_task_completed_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_completed_at();

-- 3. Backfill completed_at for existing done tasks
UPDATE public.tasks
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;

-- 4. Create view for sprint analytics
CREATE OR REPLACE VIEW public.sprint_analytics AS
SELECT
    s.id AS sprint_id,
    s.name AS sprint_name,
    s.team_id,
    s.start_date,
    s.end_date,
    s.status,
    s.velocity AS planned_velocity,
    COUNT(t.id) AS total_stories,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) AS completed_stories,
    SUM(t.story_points) AS total_points,
    SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END) AS completed_points,
    CASE
        WHEN SUM(t.story_points) > 0 THEN
            ROUND((SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END)::numeric /
                   SUM(t.story_points)::numeric) * 100, 2)
        ELSE 0
    END AS completion_percentage,
    -- Calculate days (date subtraction returns integer in PostgreSQL)
    (s.end_date::date - s.start_date::date) + 1 AS sprint_duration_days,
    CASE
        WHEN s.status = 'active' THEN
            (CURRENT_DATE - s.start_date::date) + 1
        ELSE
            (s.end_date::date - s.start_date::date) + 1
    END AS elapsed_days
FROM public.sprints s
LEFT JOIN public.tasks t ON s.id = t.sprint_id
GROUP BY s.id, s.name, s.team_id, s.start_date, s.end_date, s.status, s.velocity;

-- 5. Create function to get team velocity history
CREATE OR REPLACE FUNCTION get_team_velocity_history(team_uuid UUID, limit_count INTEGER DEFAULT 6)
RETURNS TABLE (
    sprint_id UUID,
    sprint_name TEXT,
    sprint_status TEXT,
    start_date DATE,
    end_date DATE,
    committed_points INTEGER,
    completed_points INTEGER,
    completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.sprint_id,
        sa.sprint_name,
        sa.status,
        sa.start_date,
        sa.end_date,
        COALESCE(sa.total_points, 0)::INTEGER,
        COALESCE(sa.completed_points, 0)::INTEGER,
        sa.completion_percentage
    FROM public.sprint_analytics sa
    WHERE sa.team_id = team_uuid
        AND sa.status IN ('completed', 'active')
    ORDER BY sa.end_date DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get burndown data
CREATE OR REPLACE FUNCTION get_sprint_burndown_data(sprint_uuid UUID)
RETURNS TABLE (
    day_number INTEGER,
    day_date DATE,
    total_points INTEGER,
    completed_points INTEGER,
    remaining_points INTEGER
) AS $$
DECLARE
    sprint_start DATE;
    sprint_end DATE;
    total_story_points INTEGER;
    day_count INTEGER;
BEGIN
    -- Get sprint dates and total points
    SELECT s.start_date, s.end_date, COALESCE(SUM(t.story_points), 0)
    INTO sprint_start, sprint_end, total_story_points
    FROM public.sprints s
    LEFT JOIN public.tasks t ON s.id = t.sprint_id
    WHERE s.id = sprint_uuid
    GROUP BY s.id, s.start_date, s.end_date;

    day_count := 0;

    -- Generate data for each day
    FOR day_date IN
        SELECT generate_series(sprint_start, sprint_end, '1 day'::interval)::DATE
    LOOP
        -- Calculate completed points up to this day
        SELECT COALESCE(SUM(t.story_points), 0)
        INTO completed_points
        FROM public.tasks t
        WHERE t.sprint_id = sprint_uuid
            AND t.status = 'done'
            AND t.completed_at::DATE <= day_date;

        remaining_points := total_story_points - completed_points;
        day_number := day_count;
        total_points := total_story_points;

        RETURN NEXT;
        day_count := day_count + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add comments
COMMENT ON FUNCTION update_task_completed_at() IS 'Automatically sets/clears completed_at when task status changes to/from done';
COMMENT ON VIEW public.sprint_analytics IS 'Aggregated analytics data for sprints';
COMMENT ON FUNCTION get_team_velocity_history(UUID, INTEGER) IS 'Returns velocity history for a team';
COMMENT ON FUNCTION get_sprint_burndown_data(UUID) IS 'Returns daily burndown data for a sprint';

-- ================================================
-- END OF MIGRATION
-- ================================================

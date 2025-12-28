-- ================================================
-- MIGRATION: Add Backlog Ordering Support
-- ================================================
-- This migration adds order_index to tasks table for drag-and-drop prioritization
-- Execute this in the Supabase SQL Editor
-- ================================================

-- 1. Add order_index column to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'tasks'
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Initialize order_index for existing tasks
-- For backlog items (no sprint), order by priority then created_at
WITH backlog_ordered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            ORDER BY
                CASE priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                created_at DESC
        ) - 1 as new_order
    FROM public.tasks
    WHERE sprint_id IS NULL
)
UPDATE public.tasks t
SET order_index = bo.new_order
FROM backlog_ordered bo
WHERE t.id = bo.id AND t.sprint_id IS NULL;

-- 3. For sprint items, order within each sprint
WITH sprint_ordered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY sprint_id
            ORDER BY created_at DESC
        ) - 1 as new_order
    FROM public.tasks
    WHERE sprint_id IS NOT NULL
)
UPDATE public.tasks t
SET order_index = so.new_order
FROM sprint_ordered so
WHERE t.id = so.id AND t.sprint_id IS NOT NULL;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON public.tasks(order_index);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_order ON public.tasks(sprint_id, order_index);

-- 5. Create function to auto-assign order_index to new backlog items
CREATE OR REPLACE FUNCTION assign_order_index_to_new_task()
RETURNS TRIGGER AS $$
BEGIN
    -- Only assign order_index if it's not explicitly set and item is in backlog
    IF NEW.order_index IS NULL OR NEW.order_index = 0 THEN
        IF NEW.sprint_id IS NULL THEN
            -- For backlog items, put at the end
            SELECT COALESCE(MAX(order_index), -1) + 1 INTO NEW.order_index
            FROM public.tasks
            WHERE sprint_id IS NULL;
        ELSE
            -- For sprint items, put at the end of the sprint
            SELECT COALESCE(MAX(order_index), -1) + 1 INTO NEW.order_index
            FROM public.tasks
            WHERE sprint_id = NEW.sprint_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for auto-assigning order_index
DROP TRIGGER IF EXISTS trigger_assign_order_index ON public.tasks;
CREATE TRIGGER trigger_assign_order_index
    BEFORE INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION assign_order_index_to_new_task();

-- 7. Add comments
COMMENT ON COLUMN public.tasks.order_index IS 'Order index for drag-and-drop prioritization. Lower numbers appear first.';

-- ================================================
-- END OF MIGRATION
-- ================================================

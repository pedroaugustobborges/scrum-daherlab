-- ================================================
-- MIGRATION: Add Subtasks to User Stories
-- ================================================
-- This migration adds support for subtasks within tasks (user stories)
-- Execute this in the Supabase SQL Editor after running supabase_setup.sql
-- ================================================

-- 1. Create subtasks table
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    order_index INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON public.subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON public.subtasks(status);

-- 3. Add trigger for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_subtasks_updated_at ON public.subtasks;
CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON public.subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "Subtasks are viewable by authenticated users" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated users can create subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated users can update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Subtask creators can delete subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated users can delete subtasks" ON public.subtasks;

-- 6. RLS Policies for subtasks
CREATE POLICY "Subtasks are viewable by authenticated users"
    ON public.subtasks FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create subtasks"
    ON public.subtasks FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update subtasks"
    ON public.subtasks FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete subtasks"
    ON public.subtasks FOR DELETE
    USING (auth.role() = 'authenticated');

-- 7. Add comment
COMMENT ON TABLE public.subtasks IS 'Subtasks/checklist items for user stories (tasks)';

-- ================================================
-- View for task statistics including subtasks
-- ================================================
CREATE OR REPLACE VIEW public.task_statistics AS
SELECT
    t.id AS task_id,
    t.title AS task_title,
    t.status AS task_status,
    t.story_points,
    COUNT(st.id) AS total_subtasks,
    COUNT(CASE WHEN st.status = 'done' THEN 1 END) AS completed_subtasks,
    COUNT(CASE WHEN st.status = 'in-progress' THEN 1 END) AS in_progress_subtasks,
    COUNT(CASE WHEN st.status = 'todo' THEN 1 END) AS todo_subtasks,
    CASE
        WHEN COUNT(st.id) > 0 THEN
            ROUND((COUNT(CASE WHEN st.status = 'done' THEN 1 END)::numeric / COUNT(st.id)::numeric) * 100, 2)
        ELSE 0
    END AS subtask_completion_percentage
FROM public.tasks t
LEFT JOIN public.subtasks st ON t.id = st.task_id
GROUP BY t.id, t.title, t.status, t.story_points;

-- ================================================
-- Function to get subtasks for a task
-- ================================================
CREATE OR REPLACE FUNCTION get_task_subtasks(task_uuid UUID)
RETURNS TABLE (
    subtask_id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    assigned_to_name TEXT,
    estimated_hours DECIMAL,
    actual_hours DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        st.id,
        st.title,
        st.description,
        st.status,
        p.full_name,
        st.estimated_hours,
        st.actual_hours,
        st.created_at
    FROM public.subtasks st
    LEFT JOIN public.profiles p ON st.assigned_to = p.id
    WHERE st.task_id = task_uuid
    ORDER BY st.order_index, st.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- END OF MIGRATION
-- ================================================

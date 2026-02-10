-- ================================================
-- HYBRID PROJECT MANAGEMENT SYSTEM - DATABASE MIGRATION
-- Extends the existing Scrum Dashboard to support
-- Agile, Predictive (Waterfall), and Hybrid methodologies
-- ================================================

-- ================================================
-- 1. PROJECT CONFIGURATION TABLE
-- Stores methodology and enabled modules per project
-- ================================================

CREATE TABLE IF NOT EXISTS public.project_configuration (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,

    -- Methodology selection
    methodology TEXT DEFAULT 'agile' CHECK (methodology IN ('agile', 'predictive', 'hybrid')),

    -- Module toggles (Agile modules)
    module_kanban BOOLEAN DEFAULT true,
    module_backlog BOOLEAN DEFAULT true,
    module_sprints BOOLEAN DEFAULT true,

    -- Module toggles (Predictive modules)
    module_gantt BOOLEAN DEFAULT false,
    module_wbs BOOLEAN DEFAULT false,
    module_grid_view BOOLEAN DEFAULT false,

    -- Module toggles (Shared modules)
    module_calendar BOOLEAN DEFAULT false,
    module_timeline BOOLEAN DEFAULT false,

    -- Gantt-specific settings
    gantt_zoom_level TEXT DEFAULT 'week' CHECK (gantt_zoom_level IN ('day', 'week', 'month', 'quarter', 'year')),
    working_days_per_week INTEGER DEFAULT 5 CHECK (working_days_per_week >= 1 AND working_days_per_week <= 7),
    hours_per_day DECIMAL(4,2) DEFAULT 8 CHECK (hours_per_day > 0 AND hours_per_day <= 24),

    -- Week start day (0 = Sunday, 1 = Monday, etc.)
    week_start_day INTEGER DEFAULT 1 CHECK (week_start_day >= 0 AND week_start_day <= 6),

    -- Default view when opening project
    default_view TEXT DEFAULT 'overview',

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ================================================
-- 2. ALTER TASKS TABLE FOR HIERARCHY AND SCHEDULING
-- Add columns for parent-child relationships, WBS, and Gantt
-- ================================================

-- Parent-child hierarchy
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- WBS (Work Breakdown Structure) code - e.g., "1.2.3"
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS wbs_code TEXT;

-- Task type for different visualizations
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task' CHECK (task_type IN ('task', 'milestone', 'phase', 'summary'));

-- Hierarchy level (0 = root, 1 = first child level, etc.)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0 CHECK (hierarchy_level >= 0);

-- Summary task flag (auto-calculated from children)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_summary BOOLEAN DEFAULT false;

-- Scheduling fields for Gantt
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS planned_duration INTEGER; -- in working days
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_duration INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100);

-- Critical path fields
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS early_start DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS early_finish DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS late_start DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS late_finish DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS slack INTEGER; -- float/slack in days

-- Task constraint type for scheduling
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS constraint_type TEXT DEFAULT 'asap' CHECK (constraint_type IN (
    'asap',  -- As Soon As Possible
    'alap',  -- As Late As Possible
    'mso',   -- Must Start On
    'mfo',   -- Must Finish On
    'snet',  -- Start No Earlier Than
    'snlt',  -- Start No Later Than
    'fnet',  -- Finish No Earlier Than
    'fnlt'   -- Finish No Later Than
));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS constraint_date DATE;

-- Estimated work hours
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2);

-- ================================================
-- 3. TASK DEPENDENCIES TABLE
-- Stores predecessor/successor relationships
-- ================================================

CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    predecessor_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    successor_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,

    -- Dependency type:
    -- FS = Finish-to-Start (most common): successor starts after predecessor finishes
    -- SS = Start-to-Start: successor starts when predecessor starts
    -- FF = Finish-to-Finish: successor finishes when predecessor finishes
    -- SF = Start-to-Finish: successor finishes when predecessor starts
    dependency_type TEXT DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),

    -- Lag/lead time in days (negative for lead, positive for lag)
    lag_days INTEGER DEFAULT 0,

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Prevent duplicate dependencies
    UNIQUE(predecessor_id, successor_id),

    -- Prevent self-referencing
    CHECK (predecessor_id != successor_id)
);

-- ================================================
-- 4. PROJECT BASELINES TABLE
-- Stores snapshots of project schedule for comparison
-- ================================================

CREATE TABLE IF NOT EXISTS public.project_baselines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    baseline_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Ensure unique baseline numbers per project
    UNIQUE(project_id, baseline_number)
);

-- ================================================
-- 5. TASK BASELINES TABLE
-- Stores task data at baseline snapshot time
-- ================================================

CREATE TABLE IF NOT EXISTS public.task_baselines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    baseline_id UUID REFERENCES public.project_baselines(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,

    -- Snapshot of task scheduling data
    planned_start_date DATE,
    planned_end_date DATE,
    planned_duration INTEGER,
    planned_work_hours DECIMAL(8,2),
    planned_cost DECIMAL(12,2),

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- One baseline entry per task
    UNIQUE(baseline_id, task_id)
);

-- ================================================
-- 6. GRID VIEW COLUMN CONFIGURATION
-- Stores user preferences for grid columns per project
-- ================================================

CREATE TABLE IF NOT EXISTS public.grid_view_columns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

    -- Column configuration as JSON array
    -- Example: [{"field": "title", "width": 300, "visible": true, "order": 0}, ...]
    column_config JSONB NOT NULL DEFAULT '[]',

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- One config per user per project
    UNIQUE(project_id, user_id)
);

-- ================================================
-- 7. RESOURCE ALLOCATIONS TABLE
-- For tracking resource assignments to tasks
-- ================================================

CREATE TABLE IF NOT EXISTS public.resource_allocations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

    -- Allocation percentage (100 = full time)
    allocation_percent INTEGER DEFAULT 100 CHECK (allocation_percent > 0 AND allocation_percent <= 100),

    -- Optional date range for allocation
    start_date DATE,
    end_date DATE,

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- One allocation per user per task
    UNIQUE(task_id, user_id)
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Project configuration indexes
CREATE INDEX IF NOT EXISTS idx_project_config_project ON public.project_configuration(project_id);
CREATE INDEX IF NOT EXISTS idx_project_config_methodology ON public.project_configuration(methodology);

-- Task hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wbs_code ON public.tasks(wbs_code);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_hierarchy_level ON public.tasks(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_tasks_is_summary ON public.tasks(is_summary);

-- Task scheduling indexes
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON public.tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON public.tasks(end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_critical ON public.tasks(is_critical);

-- Task dependencies indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor ON public.task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor ON public.task_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_type ON public.task_dependencies(dependency_type);

-- Baseline indexes
CREATE INDEX IF NOT EXISTS idx_baselines_project ON public.project_baselines(project_id);
CREATE INDEX IF NOT EXISTS idx_baselines_number ON public.project_baselines(project_id, baseline_number);
CREATE INDEX IF NOT EXISTS idx_task_baselines_baseline ON public.task_baselines(baseline_id);
CREATE INDEX IF NOT EXISTS idx_task_baselines_task ON public.task_baselines(task_id);

-- Grid view indexes
CREATE INDEX IF NOT EXISTS idx_grid_columns_project_user ON public.grid_view_columns(project_id, user_id);

-- Resource allocation indexes
CREATE INDEX IF NOT EXISTS idx_resource_allocations_task ON public.resource_allocations(task_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_user ON public.resource_allocations(user_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE public.project_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grid_view_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;

-- Project Configuration Policies
CREATE POLICY "Project config viewable by authenticated users" ON public.project_configuration
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert project config" ON public.project_configuration
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project config" ON public.project_configuration
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project config" ON public.project_configuration
    FOR DELETE USING (auth.role() = 'authenticated');

-- Task Dependencies Policies
CREATE POLICY "Dependencies viewable by authenticated users" ON public.task_dependencies
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage dependencies" ON public.task_dependencies
    FOR ALL USING (auth.role() = 'authenticated');

-- Project Baselines Policies
CREATE POLICY "Baselines viewable by authenticated users" ON public.project_baselines
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create baselines" ON public.project_baselines
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update baselines" ON public.project_baselines
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete baselines" ON public.project_baselines
    FOR DELETE USING (auth.role() = 'authenticated');

-- Task Baselines Policies
CREATE POLICY "Task baselines viewable by authenticated users" ON public.task_baselines
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage task baselines" ON public.task_baselines
    FOR ALL USING (auth.role() = 'authenticated');

-- Grid View Columns Policies (user-specific)
CREATE POLICY "Grid columns viewable by owner" ON public.grid_view_columns
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own grid columns" ON public.grid_view_columns
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own grid columns" ON public.grid_view_columns
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own grid columns" ON public.grid_view_columns
    FOR DELETE USING (user_id = auth.uid());

-- Resource Allocations Policies
CREATE POLICY "Resource allocations viewable by authenticated" ON public.resource_allocations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage allocations" ON public.resource_allocations
    FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- TRIGGERS
-- ================================================

-- Auto-update timestamps
CREATE TRIGGER set_project_configuration_updated_at
    BEFORE UPDATE ON public.project_configuration
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_grid_view_columns_updated_at
    BEFORE UPDATE ON public.grid_view_columns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to get full task hierarchy path as text
CREATE OR REPLACE FUNCTION get_task_hierarchy_path(task_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    path TEXT := '';
    current_id UUID := task_uuid;
    parent_id UUID;
    task_title TEXT;
BEGIN
    LOOP
        SELECT t.title, t.parent_task_id INTO task_title, parent_id
        FROM public.tasks t WHERE t.id = current_id;

        IF task_title IS NULL THEN
            EXIT;
        END IF;

        IF path = '' THEN
            path := task_title;
        ELSE
            path := task_title || ' > ' || path;
        END IF;

        EXIT WHEN parent_id IS NULL;
        current_id := parent_id;
    END LOOP;

    RETURN path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate WBS codes for a project
CREATE OR REPLACE FUNCTION recalculate_wbs_codes(project_uuid UUID)
RETURNS VOID AS $$
DECLARE
    root_task RECORD;
    root_counter INTEGER := 1;
BEGIN
    -- Reset all WBS codes for this project
    UPDATE public.tasks SET wbs_code = NULL, hierarchy_level = 0 WHERE project_id = project_uuid;

    -- Assign WBS codes to root tasks (no parent)
    FOR root_task IN
        SELECT id FROM public.tasks
        WHERE project_id = project_uuid AND parent_task_id IS NULL
        ORDER BY order_index, created_at
    LOOP
        UPDATE public.tasks SET wbs_code = root_counter::TEXT, hierarchy_level = 0
        WHERE id = root_task.id;

        -- Recursively assign to children
        PERFORM assign_wbs_to_children(root_task.id, root_counter::TEXT, 1);

        root_counter := root_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to recursively assign WBS codes to children
CREATE OR REPLACE FUNCTION assign_wbs_to_children(parent_uuid UUID, parent_wbs TEXT, level INTEGER)
RETURNS VOID AS $$
DECLARE
    child_task RECORD;
    child_counter INTEGER := 1;
BEGIN
    FOR child_task IN
        SELECT id FROM public.tasks
        WHERE parent_task_id = parent_uuid
        ORDER BY order_index, created_at
    LOOP
        UPDATE public.tasks
        SET wbs_code = parent_wbs || '.' || child_counter::TEXT,
            hierarchy_level = level
        WHERE id = child_task.id;

        -- Mark parent as summary task
        UPDATE public.tasks SET is_summary = true WHERE id = parent_uuid;

        -- Recursively assign to grandchildren
        PERFORM assign_wbs_to_children(child_task.id, parent_wbs || '.' || child_counter::TEXT, level + 1);

        child_counter := child_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all descendants of a task
CREATE OR REPLACE FUNCTION get_task_descendants(task_uuid UUID)
RETURNS TABLE(id UUID, title TEXT, hierarchy_level INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE task_tree AS (
        -- Base case: direct children
        SELECT t.id, t.title, t.hierarchy_level
        FROM public.tasks t
        WHERE t.parent_task_id = task_uuid

        UNION ALL

        -- Recursive case: grandchildren and beyond
        SELECT t.id, t.title, t.hierarchy_level
        FROM public.tasks t
        INNER JOIN task_tree tt ON t.parent_task_id = tt.id
    )
    SELECT * FROM task_tree;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update summary task dates based on children
CREATE OR REPLACE FUNCTION update_summary_task_dates(task_uuid UUID)
RETURNS VOID AS $$
DECLARE
    min_start DATE;
    max_end DATE;
    total_percent INTEGER;
    child_count INTEGER;
BEGIN
    -- Get date range from all descendants
    SELECT MIN(t.start_date), MAX(t.end_date), AVG(t.percent_complete)::INTEGER, COUNT(*)
    INTO min_start, max_end, total_percent, child_count
    FROM public.tasks t
    WHERE t.parent_task_id = task_uuid;

    -- Update parent task if it has children
    IF child_count > 0 THEN
        UPDATE public.tasks
        SET start_date = min_start,
            end_date = max_end,
            percent_complete = total_percent,
            is_summary = true
        WHERE id = task_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a project baseline
CREATE OR REPLACE FUNCTION create_project_baseline(
    p_project_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_baseline_id UUID;
    v_baseline_number INTEGER;
    v_user_id UUID := auth.uid();
BEGIN
    -- Get next baseline number
    SELECT COALESCE(MAX(baseline_number), 0) + 1 INTO v_baseline_number
    FROM public.project_baselines
    WHERE project_id = p_project_id;

    -- Create baseline record
    INSERT INTO public.project_baselines (project_id, baseline_number, name, description, created_by)
    VALUES (p_project_id, v_baseline_number, p_name, p_description, v_user_id)
    RETURNING id INTO v_baseline_id;

    -- Copy all task data to baseline
    INSERT INTO public.task_baselines (baseline_id, task_id, planned_start_date, planned_end_date, planned_duration, planned_work_hours)
    SELECT
        v_baseline_id,
        t.id,
        t.start_date,
        t.end_date,
        t.planned_duration,
        t.estimated_hours
    FROM public.tasks t
    WHERE t.project_id = p_project_id;

    RETURN v_baseline_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency(
    p_predecessor_id UUID,
    p_successor_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_cycle BOOLEAN;
BEGIN
    -- Check if adding this dependency would create a cycle
    WITH RECURSIVE dependency_chain AS (
        -- Start from the successor
        SELECT predecessor_id, successor_id, 1 as depth
        FROM public.task_dependencies
        WHERE predecessor_id = p_successor_id

        UNION ALL

        -- Follow the chain
        SELECT td.predecessor_id, td.successor_id, dc.depth + 1
        FROM public.task_dependencies td
        INNER JOIN dependency_chain dc ON td.predecessor_id = dc.successor_id
        WHERE dc.depth < 100 -- Prevent infinite loop
    )
    SELECT EXISTS (
        SELECT 1 FROM dependency_chain WHERE successor_id = p_predecessor_id
    ) INTO has_cycle;

    RETURN has_cycle;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
    IF check_circular_dependency(NEW.predecessor_id, NEW.successor_id) THEN
        RAISE EXCEPTION 'Circular dependency detected';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_dependency_cycle
    BEFORE INSERT OR UPDATE ON public.task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION prevent_circular_dependency();

-- Trigger to auto-update parent task when child changes
CREATE OR REPLACE FUNCTION trigger_update_parent_on_child_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the parent task's dates and progress
    IF NEW.parent_task_id IS NOT NULL THEN
        PERFORM update_summary_task_dates(NEW.parent_task_id);
    END IF;

    -- Also update old parent if parent changed
    IF TG_OP = 'UPDATE' AND OLD.parent_task_id IS NOT NULL AND OLD.parent_task_id != NEW.parent_task_id THEN
        PERFORM update_summary_task_dates(OLD.parent_task_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parent_on_child_change
    AFTER INSERT OR UPDATE OF start_date, end_date, percent_complete, parent_task_id ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_parent_on_child_change();

-- ================================================
-- VIEWS
-- ================================================

-- View for Gantt chart data with dependencies
CREATE OR REPLACE VIEW public.gantt_task_view AS
SELECT
    t.id,
    t.title,
    t.description,
    t.parent_task_id,
    t.wbs_code,
    t.task_type,
    t.hierarchy_level,
    t.is_summary,
    t.start_date,
    t.end_date,
    t.planned_duration,
    t.percent_complete,
    t.is_critical,
    t.early_start,
    t.early_finish,
    t.late_start,
    t.late_finish,
    t.slack,
    t.status,
    t.priority,
    t.project_id,
    t.sprint_id,
    t.assigned_to,
    t.order_index,
    p.full_name as assigned_to_name,
    -- Aggregate dependencies
    (SELECT json_agg(json_build_object(
        'id', d.id,
        'predecessor_id', d.predecessor_id,
        'type', d.dependency_type,
        'lag', d.lag_days
    )) FROM public.task_dependencies d WHERE d.successor_id = t.id) as predecessors,
    (SELECT json_agg(json_build_object(
        'id', d.id,
        'successor_id', d.successor_id,
        'type', d.dependency_type,
        'lag', d.lag_days
    )) FROM public.task_dependencies d WHERE d.predecessor_id = t.id) as successors
FROM public.tasks t
LEFT JOIN public.profiles p ON t.assigned_to = p.id;

-- View for WBS tree structure
CREATE OR REPLACE VIEW public.wbs_tree_view AS
WITH RECURSIVE task_tree AS (
    -- Base case: root tasks (no parent)
    SELECT
        t.id,
        t.title,
        t.wbs_code,
        t.task_type,
        t.parent_task_id,
        t.project_id,
        t.order_index,
        0 as depth,
        ARRAY[t.order_index] as path,
        t.title as full_path
    FROM public.tasks t
    WHERE t.parent_task_id IS NULL

    UNION ALL

    -- Recursive case: child tasks
    SELECT
        t.id,
        t.title,
        t.wbs_code,
        t.task_type,
        t.parent_task_id,
        t.project_id,
        t.order_index,
        tt.depth + 1,
        tt.path || t.order_index,
        tt.full_path || ' > ' || t.title
    FROM public.tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.id
)
SELECT * FROM task_tree ORDER BY path;

-- View for project configuration with project name
CREATE OR REPLACE VIEW public.project_config_view AS
SELECT
    pc.*,
    p.name as project_name,
    p.status as project_status
FROM public.project_configuration pc
JOIN public.projects p ON pc.project_id = p.id;

-- ================================================
-- DEFAULT PROJECT CONFIGURATION FUNCTION
-- Creates config with smart defaults based on methodology
-- ================================================

CREATE OR REPLACE FUNCTION create_default_project_config(
    p_project_id UUID,
    p_methodology TEXT DEFAULT 'agile'
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    INSERT INTO public.project_configuration (
        project_id,
        methodology,
        module_kanban,
        module_backlog,
        module_sprints,
        module_gantt,
        module_wbs,
        module_grid_view,
        module_calendar,
        module_timeline,
        default_view
    )
    VALUES (
        p_project_id,
        p_methodology,
        -- Agile modules
        p_methodology IN ('agile', 'hybrid'),      -- kanban
        p_methodology IN ('agile', 'hybrid'),      -- backlog
        p_methodology IN ('agile', 'hybrid'),      -- sprints
        -- Predictive modules
        p_methodology IN ('predictive', 'hybrid'), -- gantt
        p_methodology IN ('predictive', 'hybrid'), -- wbs
        p_methodology IN ('predictive', 'hybrid'), -- grid_view
        -- Shared modules
        true,                                       -- calendar always on
        p_methodology IN ('predictive', 'hybrid'), -- timeline
        -- Default view
        CASE
            WHEN p_methodology = 'agile' THEN 'kanban'
            WHEN p_methodology = 'predictive' THEN 'gantt'
            ELSE 'overview'
        END
    )
    RETURNING id INTO v_config_id;

    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- MIGRATION COMPLETE
-- Run this file in your Supabase SQL editor
-- ================================================

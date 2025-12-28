-- ================================================
-- MIGRATION: Sprint Ceremonies (Retrospectives & Reviews)
-- ================================================
-- This migration adds support for sprint retrospectives and review meetings
-- Execute this in the Supabase SQL Editor
-- ================================================

-- 1. Create sprint_retrospectives table
CREATE TABLE IF NOT EXISTS public.sprint_retrospectives (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sprint_id UUID REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
    meeting_date DATE NOT NULL,
    attendees TEXT[], -- Array of participant names/emails
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5), -- 1=Poor, 5=Excellent
    summary TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(sprint_id) -- One retrospective per sprint
);

-- 2. Create retrospective_items table
CREATE TABLE IF NOT EXISTS public.retrospective_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    retrospective_id UUID REFERENCES public.sprint_retrospectives(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('went_well', 'to_improve', 'action_item')),
    content TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
    order_index INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Create sprint_reviews table
CREATE TABLE IF NOT EXISTS public.sprint_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sprint_id UUID REFERENCES public.sprints(id) ON DELETE CASCADE NOT NULL,
    meeting_date DATE NOT NULL,
    attendees TEXT[], -- Array of participant names/emails including stakeholders
    demo_notes TEXT,
    stakeholder_feedback TEXT,
    accepted_stories INTEGER DEFAULT 0,
    rejected_stories INTEGER DEFAULT 0,
    overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
    next_steps TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(sprint_id) -- One review per sprint
);

-- 4. Create review_story_feedback table
CREATE TABLE IF NOT EXISTS public.review_story_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID REFERENCES public.sprint_reviews(id) ON DELETE CASCADE NOT NULL,
    story_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    demonstrated BOOLEAN DEFAULT false,
    accepted BOOLEAN DEFAULT false,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_retrospectives_sprint ON public.sprint_retrospectives(sprint_id);
CREATE INDEX IF NOT EXISTS idx_retrospective_items_retro ON public.retrospective_items(retrospective_id);
CREATE INDEX IF NOT EXISTS idx_retrospective_items_category ON public.retrospective_items(category);
CREATE INDEX IF NOT EXISTS idx_reviews_sprint ON public.sprint_reviews(sprint_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_review ON public.review_story_feedback(review_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_story ON public.review_story_feedback(story_id);

-- 6. Add triggers for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_retrospectives_updated_at ON public.sprint_retrospectives;
CREATE TRIGGER update_retrospectives_updated_at BEFORE UPDATE ON public.sprint_retrospectives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retrospective_items_updated_at ON public.retrospective_items;
CREATE TRIGGER update_retrospective_items_updated_at BEFORE UPDATE ON public.retrospective_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.sprint_reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.sprint_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable RLS
ALTER TABLE public.sprint_retrospectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retrospective_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_story_feedback ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies if they exist
DROP POLICY IF EXISTS "Retrospectives viewable by authenticated users" ON public.sprint_retrospectives;
DROP POLICY IF EXISTS "Authenticated users can create retrospectives" ON public.sprint_retrospectives;
DROP POLICY IF EXISTS "Users can update retrospectives they created" ON public.sprint_retrospectives;
DROP POLICY IF EXISTS "Retrospective items viewable by authenticated users" ON public.retrospective_items;
DROP POLICY IF EXISTS "Authenticated users can create retrospective items" ON public.retrospective_items;
DROP POLICY IF EXISTS "Users can update their retrospective items" ON public.retrospective_items;
DROP POLICY IF EXISTS "Users can delete their retrospective items" ON public.retrospective_items;
DROP POLICY IF EXISTS "Reviews viewable by authenticated users" ON public.sprint_reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.sprint_reviews;
DROP POLICY IF EXISTS "Users can update reviews they created" ON public.sprint_reviews;
DROP POLICY IF EXISTS "Review feedback viewable by authenticated users" ON public.review_story_feedback;
DROP POLICY IF EXISTS "Authenticated users can manage review feedback" ON public.review_story_feedback;

-- 9. RLS Policies
CREATE POLICY "Retrospectives viewable by authenticated users"
    ON public.sprint_retrospectives FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create retrospectives"
    ON public.sprint_retrospectives FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update retrospectives they created"
    ON public.sprint_retrospectives FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Retrospective items viewable by authenticated users"
    ON public.retrospective_items FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create retrospective items"
    ON public.retrospective_items FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their retrospective items"
    ON public.retrospective_items FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their retrospective items"
    ON public.retrospective_items FOR DELETE
    USING (created_by = auth.uid());

CREATE POLICY "Reviews viewable by authenticated users"
    ON public.sprint_reviews FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create reviews"
    ON public.sprint_reviews FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update reviews they created"
    ON public.sprint_reviews FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Review feedback viewable by authenticated users"
    ON public.review_story_feedback FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage review feedback"
    ON public.review_story_feedback FOR ALL
    USING (auth.role() = 'authenticated');

-- 10. Create view for retrospective analytics
CREATE OR REPLACE VIEW public.team_retrospective_insights AS
SELECT
    t.id AS team_id,
    t.name AS team_name,
    COUNT(DISTINCT sr.id) AS total_retrospectives,
    ROUND(AVG(sr.mood_rating), 2) AS average_mood,
    COUNT(CASE WHEN ri.category = 'action_item' AND ri.status = 'done' THEN 1 END) AS completed_actions,
    COUNT(CASE WHEN ri.category = 'action_item' AND ri.status = 'pending' THEN 1 END) AS pending_actions,
    COUNT(CASE WHEN ri.category = 'went_well' THEN 1 END) AS positive_items,
    COUNT(CASE WHEN ri.category = 'to_improve' THEN 1 END) AS improvement_items
FROM public.teams t
LEFT JOIN public.sprints s ON t.id = s.team_id
LEFT JOIN public.sprint_retrospectives sr ON s.id = sr.sprint_id
LEFT JOIN public.retrospective_items ri ON sr.id = ri.retrospective_id
GROUP BY t.id, t.name;

-- 11. Create function to get action items for next sprint
CREATE OR REPLACE FUNCTION get_pending_action_items(team_uuid UUID)
RETURNS TABLE (
    action_id UUID,
    action_content TEXT,
    sprint_name TEXT,
    assigned_to_name TEXT,
    created_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ri.id,
        ri.content,
        sp.name,
        p.full_name,
        ri.created_at
    FROM public.retrospective_items ri
    JOIN public.sprint_retrospectives sr ON ri.retrospective_id = sr.id
    JOIN public.sprints sp ON sr.sprint_id = sp.id
    LEFT JOIN public.profiles p ON ri.assigned_to = p.id
    WHERE sp.team_id = team_uuid
        AND ri.category = 'action_item'
        AND ri.status IN ('pending', 'in_progress')
    ORDER BY ri.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to calculate team improvement trend
CREATE OR REPLACE FUNCTION calculate_team_improvement_trend(team_uuid UUID, sprint_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    sprint_name TEXT,
    mood_rating INTEGER,
    action_completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.name,
        sr.mood_rating,
        CASE
            WHEN COUNT(ri.id) FILTER (WHERE ri.category = 'action_item') > 0 THEN
                ROUND((COUNT(ri.id) FILTER (WHERE ri.category = 'action_item' AND ri.status = 'done')::NUMERIC /
                       COUNT(ri.id) FILTER (WHERE ri.category = 'action_item')::NUMERIC) * 100, 2)
            ELSE 0
        END AS action_completion_rate
    FROM public.sprints sp
    LEFT JOIN public.sprint_retrospectives sr ON sp.id = sr.sprint_id
    LEFT JOIN public.retrospective_items ri ON sr.id = ri.retrospective_id
    WHERE sp.team_id = team_uuid
        AND sp.status = 'completed'
    GROUP BY sp.id, sp.name, sp.end_date, sr.mood_rating
    ORDER BY sp.end_date DESC
    LIMIT sprint_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Add comments
COMMENT ON TABLE public.sprint_retrospectives IS 'Sprint retrospective meetings and overall ratings';
COMMENT ON TABLE public.retrospective_items IS 'Individual items from retrospectives (went well, to improve, actions)';
COMMENT ON TABLE public.sprint_reviews IS 'Sprint review meetings with stakeholders';
COMMENT ON TABLE public.review_story_feedback IS 'Feedback on individual stories during sprint review';
COMMENT ON VIEW public.team_retrospective_insights IS 'Aggregated retrospective data per team';
COMMENT ON FUNCTION get_pending_action_items(UUID) IS 'Returns pending action items from retrospectives for a team';
COMMENT ON FUNCTION calculate_team_improvement_trend(UUID, INTEGER) IS 'Calculates mood and action completion trends over recent sprints';

-- ================================================
-- END OF MIGRATION
-- ================================================

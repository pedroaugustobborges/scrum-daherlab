-- Calendar Subscriptions Table
-- Stores user's external calendar subscriptions (ICS URLs from Google Calendar, Outlook, etc.)

CREATE TABLE IF NOT EXISTS public.calendar_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    ics_url TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    calendar_type TEXT DEFAULT 'other' CHECK (calendar_type IN ('google', 'outlook', 'apple', 'other')),
    is_enabled BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    last_sync_error TEXT,
    cached_events JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, ics_url)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_subs_user ON public.calendar_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_subs_enabled ON public.calendar_subscriptions(is_enabled);

-- RLS Policies
ALTER TABLE public.calendar_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendar subs viewable by owner" ON public.calendar_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar subs" ON public.calendar_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar subs" ON public.calendar_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar subs" ON public.calendar_subscriptions
    FOR DELETE USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER set_calendar_subs_updated_at
    BEFORE UPDATE ON public.calendar_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- TASK MILESTONE GAMIFICATION
-- Tracks which milestone notifications have been sent
-- per user to prevent duplicates.
-- ================================================

CREATE TABLE IF NOT EXISTS public.user_task_milestones (
  id                       UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone                INTEGER     NOT NULL,           -- 10, 20, 30 …
  achieved_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  batch_duration_ms        BIGINT,     -- ms to finish this batch of 10
  previous_batch_duration_ms BIGINT,   -- ms of prior batch (for comparison)
  UNIQUE (user_id, milestone)
);

-- RLS: each user can only read/write their own milestones
ALTER TABLE public.user_task_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones"
  ON public.user_task_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones"
  ON public.user_task_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

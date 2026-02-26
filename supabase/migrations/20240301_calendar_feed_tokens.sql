-- Calendar Feed Tokens table
-- Stores tokens for accessing the live ICS calendar feed

CREATE TABLE IF NOT EXISTS calendar_feed_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100) DEFAULT 'Default',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  CONSTRAINT token_min_length CHECK (char_length(token) >= 32)
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_calendar_feed_tokens_token ON calendar_feed_tokens(token);
CREATE INDEX IF NOT EXISTS idx_calendar_feed_tokens_user_id ON calendar_feed_tokens(user_id);

-- RLS policies
ALTER TABLE calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own tokens"
  ON calendar_feed_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own tokens
CREATE POLICY "Users can create own tokens"
  ON calendar_feed_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own tokens"
  ON calendar_feed_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own tokens"
  ON calendar_feed_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant access to service role for edge function
GRANT ALL ON calendar_feed_tokens TO service_role;

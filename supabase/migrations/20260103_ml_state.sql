-- =============================================================================
-- STUNTMAN ML LEARNING STATE TABLE
-- =============================================================================
-- Version: 1.0.0
-- Created: 2026-01-03
-- Description: Persistent storage for adaptive ML learning state
-- =============================================================================

-- ML learning state storage (single row per key)
CREATE TABLE IF NOT EXISTS stuntman_ml_state (
  key TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_stuntman_ml_state_updated
  ON stuntman_ml_state(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE stuntman_ml_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (needed for server-side operations)
CREATE POLICY "Service role full access"
  ON stuntman_ml_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read and write (for frontend if needed)
CREATE POLICY "Authenticated users can manage ML state"
  ON stuntman_ml_state
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon users to read (for paper trading without login)
CREATE POLICY "Anonymous users can read ML state"
  ON stuntman_ml_state
  FOR SELECT
  TO anon
  USING (true);

-- Comment on table
COMMENT ON TABLE stuntman_ml_state IS 'Stores adaptive ML learning state for the StuntMan trading system. Persists across sessions to enable continuous learning.';
COMMENT ON COLUMN stuntman_ml_state.key IS 'Unique identifier for the learning state (e.g., stuntman_ml_learning_state)';
COMMENT ON COLUMN stuntman_ml_state.state IS 'JSONB blob containing all learning data: trade history, strategy performance, optimal parameters, etc.';

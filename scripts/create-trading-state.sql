-- STUNTMAN TRADING STATE TABLE
-- Run this in Supabase SQL Editor to create the persistence table
-- https://supabase.com/dashboard/project/mrmynzeymwgzevxyxnln/sql/new

-- Create the table
CREATE TABLE IF NOT EXISTS stuntman_trading_state (
  key TEXT PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trading_state_updated
  ON stuntman_trading_state(updated_at);

-- Enable RLS (Row Level Security)
ALTER TABLE stuntman_trading_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (required for serverless API)
DROP POLICY IF EXISTS "Service role access" ON stuntman_trading_state;
CREATE POLICY "Service role access" ON stuntman_trading_state
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default state
INSERT INTO stuntman_trading_state (key, state, updated_at)
VALUES (
  'stuntman_live_trading_state',
  '{
    "enabled": false,
    "currentPosition": null,
    "dailyTrades": 0,
    "dailyPnL": 0,
    "lastTradeDate": "2026-01-05",
    "totalPnL": 0,
    "totalTrades": 0,
    "totalWins": 0,
    "totalLosses": 0,
    "tradeHistory": [],
    "lastUpdated": "2026-01-05T00:00:00.000Z",
    "accountId": "APEX-456334"
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Verify creation
SELECT * FROM stuntman_trading_state;

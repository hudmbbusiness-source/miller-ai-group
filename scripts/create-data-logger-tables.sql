-- Simple tables for data-logger (no auth required)
-- Run this in Supabase SQL editor

-- Market data (5-minute candles for ES)
CREATE TABLE IF NOT EXISTS stuntman_market_data_simple (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL UNIQUE,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume BIGINT DEFAULT 0,
  hour DECIMAL(5, 2),
  date_str TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signals generated (for analysis)
CREATE TABLE IF NOT EXISTS stuntman_signals_simple (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pattern_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price DECIMAL(20, 8) NOT NULL,
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  confidence INTEGER,
  reason TEXT,
  regime TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades executed (for analysis)
CREATE TABLE IF NOT EXISTS stuntman_trades_simple (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pattern_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price DECIMAL(20, 8) NOT NULL,
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  exit_price DECIMAL(20, 8),
  exit_reason TEXT,
  pnl DECIMAL(20, 8),
  regime TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_data_simple_timestamp ON stuntman_market_data_simple(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_simple_timestamp ON stuntman_signals_simple(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_simple_timestamp ON stuntman_trades_simple(timestamp DESC);

-- No RLS - open for service role access
ALTER TABLE stuntman_market_data_simple DISABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_signals_simple DISABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_trades_simple DISABLE ROW LEVEL SECURITY;

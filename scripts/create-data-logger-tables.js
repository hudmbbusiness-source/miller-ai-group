/**
 * Create tables for STUNTMAN data logging
 * Run: node scripts/create-data-logger-tables.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mrmynzeymwgzevxyxnln.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybXluemV5bXdnemV2eHl4bmxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA1NjEzOSwiZXhwIjoyMDgwNjMyMTM5fQ.YThlzZu_RV49hzncJCIwRh1fgTG9-Vp1bHFm5dZ3E6A'
)

async function createTables() {
  console.log('Creating STUNTMAN data logging tables...')

  // Create market data table
  const { error: err1 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_market_data (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ UNIQUE NOT NULL,
        open DECIMAL(10,2) NOT NULL,
        high DECIMAL(10,2) NOT NULL,
        low DECIMAL(10,2) NOT NULL,
        close DECIMAL(10,2) NOT NULL,
        volume BIGINT,
        hour DECIMAL(4,2),
        date_str TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON stuntman_market_data(timestamp);
    `
  })

  if (err1) {
    console.log('Note: RPC not available, trying direct insert test...')
    // Tables might already exist or we need to create via Supabase dashboard
  }

  // Create signals table
  const { error: err2 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_signals (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        pattern_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price DECIMAL(10,2),
        stop_loss DECIMAL(10,2),
        take_profit DECIMAL(10,2),
        confidence INTEGER,
        reason TEXT,
        regime TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  })

  // Create trades table
  const { error: err3 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_trades (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        pattern_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price DECIMAL(10,2),
        stop_loss DECIMAL(10,2),
        take_profit DECIMAL(10,2),
        exit_price DECIMAL(10,2),
        exit_reason TEXT,
        pnl DECIMAL(10,2),
        regime TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  })

  // Test by inserting a dummy record
  console.log('Testing table access...')

  const { error: testErr } = await supabase
    .from('stuntman_market_data')
    .upsert({
      timestamp: new Date().toISOString(),
      open: 5900,
      high: 5910,
      low: 5890,
      close: 5905,
      volume: 1000,
      hour: 10.5,
      date_str: new Date().toLocaleDateString()
    }, { onConflict: 'timestamp' })

  if (testErr) {
    console.log('Table test error:', testErr.message)
    console.log('')
    console.log('=== MANUAL SQL TO RUN IN SUPABASE DASHBOARD ===')
    console.log('')
    console.log(`
-- Run this SQL in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS stuntman_market_data (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ UNIQUE NOT NULL,
  open DECIMAL(10,2) NOT NULL,
  high DECIMAL(10,2) NOT NULL,
  low DECIMAL(10,2) NOT NULL,
  close DECIMAL(10,2) NOT NULL,
  volume BIGINT,
  hour DECIMAL(4,2),
  date_str TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stuntman_signals (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  pattern_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  take_profit DECIMAL(10,2),
  confidence INTEGER,
  reason TEXT,
  regime TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stuntman_trades (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  pattern_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  take_profit DECIMAL(10,2),
  exit_price DECIMAL(10,2),
  exit_reason TEXT,
  pnl DECIMAL(10,2),
  regime TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON stuntman_market_data(timestamp);
    `)
  } else {
    console.log('✅ Tables ready!')
  }
}

createTables()

/**
 * Create stuntman_trading_state table in Supabase
 *
 * Run with: node scripts/create-trading-state-table.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mrmynzeymwgzevxyxnln.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable required');
  console.log('Run with: SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/create-trading-state-table.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('Creating stuntman_trading_state table...');

  // First check if table exists
  const { data: existingData, error: checkError } = await supabase
    .from('stuntman_trading_state')
    .select('key')
    .limit(1);

  if (!checkError) {
    console.log('Table already exists!');
    return;
  }

  // Table doesn't exist, create via SQL
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_trading_state (
        key TEXT PRIMARY KEY,
        state JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_trading_state_updated
        ON stuntman_trading_state(updated_at);
    `
  });

  if (error) {
    // Try alternative approach - direct insert will create if RLS allows
    console.log('RPC not available, trying direct insert...');

    const { error: insertError } = await supabase
      .from('stuntman_trading_state')
      .upsert({
        key: 'stuntman_live_trading_state',
        state: {
          enabled: false,
          currentPosition: null,
          dailyTrades: 0,
          dailyPnL: 0,
          lastTradeDate: new Date().toISOString().split('T')[0],
          totalPnL: 0,
          totalTrades: 0,
          totalWins: 0,
          totalLosses: 0,
          tradeHistory: [],
          lastUpdated: new Date().toISOString(),
          accountId: 'APEX-456334'
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (insertError) {
      console.error('Error:', insertError.message);
      console.log('\nYou need to create the table manually in Supabase SQL Editor:');
      console.log(`
CREATE TABLE stuntman_trading_state (
  key TEXT PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trading_state_updated ON stuntman_trading_state(updated_at);

-- Enable RLS
ALTER TABLE stuntman_trading_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role access" ON stuntman_trading_state
  FOR ALL USING (true) WITH CHECK (true);
      `);
      process.exit(1);
    }

    console.log('Table created and initialized successfully!');
    return;
  }

  console.log('Table created successfully!');

  // Insert default state
  const { error: insertError } = await supabase
    .from('stuntman_trading_state')
    .upsert({
      key: 'stuntman_live_trading_state',
      state: {
        enabled: false,
        currentPosition: null,
        dailyTrades: 0,
        dailyPnL: 0,
        lastTradeDate: new Date().toISOString().split('T')[0],
        totalPnL: 0,
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        tradeHistory: [],
        lastUpdated: new Date().toISOString(),
        accountId: 'APEX-456334'
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (insertError) {
    console.error('Error initializing state:', insertError.message);
  } else {
    console.log('Default state initialized!');
  }
}

createTable().catch(console.error);

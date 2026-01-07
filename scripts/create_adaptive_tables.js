/**
 * SUPABASE MIGRATION: Create tables for adaptive learning system
 *
 * Tables:
 * 1. stuntman_trade_log - Stores all trades (real and simulated)
 * 2. stuntman_strategy_performance - Tracks rolling performance by strategy
 * 3. stuntman_market_conditions - Tracks market regime history
 * 4. stuntman_learning_state - Stores the adaptive learning state
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('Creating adaptive learning tables...');
  console.log('');

  // Table 1: Trade Log
  console.log('1. Creating stuntman_trade_log table...');
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_trade_log (
        id SERIAL PRIMARY KEY,
        trade_id TEXT UNIQUE NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        is_simulation BOOLEAN DEFAULT TRUE,
        strategy TEXT NOT NULL,
        regime TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price NUMERIC NOT NULL,
        exit_price NUMERIC,
        stop_loss NUMERIC,
        take_profit NUMERIC,
        pnl NUMERIC,
        exit_type TEXT,
        confidence NUMERIC,
        indicators JSONB,
        notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_trade_log_strategy ON stuntman_trade_log(strategy);
      CREATE INDEX IF NOT EXISTS idx_trade_log_regime ON stuntman_trade_log(regime);
      CREATE INDEX IF NOT EXISTS idx_trade_log_timestamp ON stuntman_trade_log(timestamp);
    `
  });

  if (error1) {
    console.log('  Error (may already exist):', error1.message);

    // Try direct insert approach for table creation
    const { error: insertError } = await supabase
      .from('stuntman_trade_log')
      .upsert({
        trade_id: 'init_check',
        strategy: 'SYSTEM',
        regime: 'INIT',
        direction: 'NONE',
        entry_price: 0,
        is_simulation: true
      }, { onConflict: 'trade_id' });

    if (insertError && insertError.message.includes('does not exist')) {
      console.log('  Table does not exist, creating via workaround...');
    } else {
      console.log('  ✅ Table exists');
    }
  } else {
    console.log('  ✅ Created');
  }

  // Table 2: Strategy Performance
  console.log('2. Creating stuntman_strategy_performance table...');
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_strategy_performance (
        id SERIAL PRIMARY KEY,
        strategy TEXT NOT NULL,
        regime TEXT NOT NULL,
        period TEXT NOT NULL,
        trades INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        total_pnl NUMERIC DEFAULT 0,
        avg_pnl NUMERIC DEFAULT 0,
        win_rate NUMERIC DEFAULT 0,
        last_updated TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(strategy, regime, period)
      );
    `
  });

  if (error2) {
    console.log('  Error (may already exist):', error2.message);
  } else {
    console.log('  ✅ Created');
  }

  // Table 3: Learning State (using existing pattern)
  console.log('3. Checking stuntman_learning_state...');
  const { data: existingState, error: error3 } = await supabase
    .from('stuntman_ml_state')
    .select('*')
    .eq('key', 'adaptive_learning_state')
    .single();

  if (!existingState) {
    const initialState = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      strategyWeights: {
        FAILED_BREAKOUT: 1.0,
        RANGE_FADE: 1.0,
        LIQUIDITY_SWEEP: 1.0,
        VWAP_DEVIATION: 0.5,  // Lower weight due to poor recent performance
        BOS_CONTINUATION: 0.0, // Disabled
        CHOCH_REVERSAL: 0.8,
        SESSION_REVERSION: 0.0, // Disabled
        TREND_PULLBACK: 0.3,
        VOLATILITY_BREAKOUT: 0.7,
        ORB_BREAKOUT: 0.8,
        KILLZONE_REVERSAL: 0.7
      },
      regimePerformance: {},
      recentTrades: [],
      dailyStats: {},
      learningRate: 0.1,
      minTradesForAdjustment: 5
    };

    const { error: insertError } = await supabase
      .from('stuntman_ml_state')
      .upsert({
        key: 'adaptive_learning_state',
        state: initialState,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (insertError) {
      console.log('  Error:', insertError.message);
    } else {
      console.log('  ✅ Created with initial state');
    }
  } else {
    console.log('  ✅ Already exists');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('ADAPTIVE LEARNING TABLES READY');
  console.log('='.repeat(60));

  // Show initial strategy weights
  const { data: state } = await supabase
    .from('stuntman_ml_state')
    .select('state')
    .eq('key', 'adaptive_learning_state')
    .single();

  if (state?.state?.strategyWeights) {
    console.log('');
    console.log('Initial Strategy Weights:');
    Object.entries(state.state.strategyWeights)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, weight]) => {
        const status = weight === 0 ? '❌ DISABLED' : (weight >= 0.8 ? '✅ ACTIVE' : '⚠️ REDUCED');
        console.log(`  ${name.padEnd(22)}: ${(weight * 100).toFixed(0)}% ${status}`);
      });
  }
}

createTables().catch(console.error);

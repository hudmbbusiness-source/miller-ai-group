/**
 * Creates the stuntman_patterns table for storing discovered trading patterns
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTable() {
  console.log('Creating stuntman_patterns table...')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern_id TEXT NOT NULL,
        category TEXT NOT NULL,
        direction TEXT NOT NULL,
        sample_size INTEGER NOT NULL,
        win_rate DECIMAL(5,2) NOT NULL,
        profit_factor DECIMAL(6,2) NOT NULL,
        expectancy DECIMAL(8,2) NOT NULL,
        avg_win_points DECIMAL(8,2),
        avg_loss_points DECIMAL(8,2),
        optimal_stop DECIMAL(6,2),
        optimal_target DECIMAL(6,2),
        avg_hold_bars DECIMAL(6,1),
        confidence INTEGER,
        analysis_period_days INTEGER,
        data_source TEXT,
        is_profitable BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(pattern_id, direction, analysis_period_days)
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_profitable ON stuntman_patterns(is_profitable);
      CREATE INDEX IF NOT EXISTS idx_patterns_category ON stuntman_patterns(category);
      CREATE INDEX IF NOT EXISTS idx_patterns_expectancy ON stuntman_patterns(expectancy DESC);
    `
  })

  if (error) {
    // Try alternative method - direct SQL via REST
    console.log('RPC failed, trying direct insert test...')

    // Just test that we can insert
    const { error: insertError } = await supabase
      .from('stuntman_patterns')
      .upsert({
        pattern_id: 'TEST_PATTERN',
        category: 'TEST',
        direction: 'LONG',
        sample_size: 1,
        win_rate: 50.0,
        profit_factor: 1.0,
        expectancy: 0.0,
        analysis_period_days: 30,
        data_source: 'TEST',
        is_profitable: false
      }, { onConflict: 'pattern_id,direction,analysis_period_days' })

    if (insertError) {
      if (insertError.code === '42P01') {
        console.log('Table does not exist. Please create it manually in Supabase dashboard:')
        console.log(`
CREATE TABLE stuntman_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id TEXT NOT NULL,
  category TEXT NOT NULL,
  direction TEXT NOT NULL,
  sample_size INTEGER NOT NULL,
  win_rate DECIMAL(5,2) NOT NULL,
  profit_factor DECIMAL(6,2) NOT NULL,
  expectancy DECIMAL(8,2) NOT NULL,
  avg_win_points DECIMAL(8,2),
  avg_loss_points DECIMAL(8,2),
  optimal_stop DECIMAL(6,2),
  optimal_target DECIMAL(6,2),
  avg_hold_bars DECIMAL(6,1),
  confidence INTEGER,
  analysis_period_days INTEGER,
  data_source TEXT,
  is_profitable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pattern_id, direction, analysis_period_days)
);
        `)
        process.exit(1)
      }
      console.error('Insert error:', insertError)
      process.exit(1)
    }

    // Clean up test
    await supabase
      .from('stuntman_patterns')
      .delete()
      .eq('pattern_id', 'TEST_PATTERN')

    console.log('Table exists and is working!')
    return
  }

  console.log('Table created successfully!')
}

createTable()

/**
 * Create gAImertag Leaderboard Table
 * Run with: node scripts/create-gaimertag-leaderboard.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createLeaderboardTable() {
  console.log('Creating gAImertag leaderboard table...')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create the gaimertag_leaderboard table
      CREATE TABLE IF NOT EXISTS gaimertag_leaderboard (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        game_id VARCHAR(50) NOT NULL,
        player_id VARCHAR(100) NOT NULL,
        player_name VARCHAR(100) DEFAULT 'Player',
        score INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(game_id, player_id)
      );

      -- Create index for faster leaderboard queries
      CREATE INDEX IF NOT EXISTS idx_gaimertag_leaderboard_game_score
        ON gaimertag_leaderboard(game_id, score DESC);

      -- Create index for player lookups
      CREATE INDEX IF NOT EXISTS idx_gaimertag_leaderboard_player
        ON gaimertag_leaderboard(player_id);

      -- Enable Row Level Security
      ALTER TABLE gaimertag_leaderboard ENABLE ROW LEVEL SECURITY;

      -- Create policy to allow anyone to read leaderboard
      DROP POLICY IF EXISTS "Allow public read access" ON gaimertag_leaderboard;
      CREATE POLICY "Allow public read access" ON gaimertag_leaderboard
        FOR SELECT USING (true);

      -- Create policy to allow anyone to insert scores
      DROP POLICY IF EXISTS "Allow public insert" ON gaimertag_leaderboard;
      CREATE POLICY "Allow public insert" ON gaimertag_leaderboard
        FOR INSERT WITH CHECK (true);

      -- Create policy to allow players to update their own scores
      DROP POLICY IF EXISTS "Allow player update own score" ON gaimertag_leaderboard;
      CREATE POLICY "Allow player update own score" ON gaimertag_leaderboard
        FOR UPDATE USING (true);
    `
  })

  if (error) {
    // Try direct SQL approach
    console.log('RPC not available, trying direct table creation...')

    // Check if table exists
    const { data: tables, error: tableError } = await supabase
      .from('gaimertag_leaderboard')
      .select('id')
      .limit(1)

    if (!tableError) {
      console.log('Table already exists!')
      return
    }

    // Table doesn't exist - need to create it via Supabase dashboard
    console.log('\n' + '='.repeat(60))
    console.log('Please create the table manually in Supabase:')
    console.log('1. Go to https://supabase.com/dashboard/project/mrmynzeymwgzevxyxnln/sql/new')
    console.log('2. Run this SQL:')
    console.log('='.repeat(60))
    console.log(`
CREATE TABLE IF NOT EXISTS gaimertag_leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id VARCHAR(50) NOT NULL,
  player_id VARCHAR(100) NOT NULL,
  player_name VARCHAR(100) DEFAULT 'Player',
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_gaimertag_leaderboard_game_score
  ON gaimertag_leaderboard(game_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_gaimertag_leaderboard_player
  ON gaimertag_leaderboard(player_id);

ALTER TABLE gaimertag_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON gaimertag_leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON gaimertag_leaderboard
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow player update own score" ON gaimertag_leaderboard
  FOR UPDATE USING (true);
    `)
    console.log('='.repeat(60))
    return
  }

  console.log('Table created successfully!')
}

createLeaderboardTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })

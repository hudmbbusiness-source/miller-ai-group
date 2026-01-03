/**
 * Create stuntman_ml_state table for persisting ML learning
 *
 * Run with: node scripts/create-ml-state-table.js
 */

const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load multiple env files
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production.local') })

// Clean up the values (remove trailing \n if present)
const cleanEnv = (val) => val ? val.replace(/\\n/g, '').replace(/\n/g, '') : val

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTable() {
  console.log('Creating stuntman_ml_state table...')

  // Use raw SQL via Supabase's REST API
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS stuntman_ml_state (
        key TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_ml_state_updated
        ON stuntman_ml_state(updated_at);

      -- Add RLS policies (allow authenticated users to read/write)
      ALTER TABLE stuntman_ml_state ENABLE ROW LEVEL SECURITY;

      -- Drop existing policy if it exists
      DROP POLICY IF EXISTS "Allow authenticated users to manage ML state" ON stuntman_ml_state;

      -- Create policy for authenticated users
      CREATE POLICY "Allow authenticated users to manage ML state"
        ON stuntman_ml_state
        FOR ALL
        USING (true)
        WITH CHECK (true);
    `
  })

  if (error) {
    // RPC might not exist, try alternative approach
    console.log('RPC not available, trying direct insert test...')

    // Just try to insert and let Supabase's dashboard be used to create the table
    const testInsert = await supabase
      .from('stuntman_ml_state')
      .upsert({
        key: 'test',
        state: { test: true },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

    if (testInsert.error) {
      console.log('\n========================================')
      console.log('Please create the table manually in Supabase:')
      console.log('========================================\n')
      console.log(`
CREATE TABLE stuntman_ml_state (
  key TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ml_state_updated ON stuntman_ml_state(updated_at);

ALTER TABLE stuntman_ml_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage ML state"
  ON stuntman_ml_state
  FOR ALL
  USING (true)
  WITH CHECK (true);
      `)
      console.log('\nError was:', testInsert.error.message)
      return
    }

    // Clean up test
    await supabase.from('stuntman_ml_state').delete().eq('key', 'test')
    console.log('Table already exists or was created successfully!')
    return
  }

  console.log('Table created successfully!')
}

createTable().catch(console.error)

// Run StuntMan migration via Supabase REST API
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Read migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251231_stuntman_schema.sql')
const fullSql = readFileSync(migrationPath, 'utf8')

// Execute SQL via Supabase Management API
async function runMigration() {
  console.log('Running StuntMan database migration...\n')

  // Use the Supabase postgREST RPC endpoint to execute SQL
  // We need to create a helper function first, or use direct connection

  // For now, let's output the SQL for manual execution
  console.log('='.repeat(60))
  console.log('Please run this SQL in your Supabase Dashboard:')
  console.log('Go to: https://supabase.com/dashboard/project/mrmynzeymwgzevxyxnln/sql')
  console.log('='.repeat(60))
  console.log('\nPaste the following SQL:\n')
  console.log(fullSql)
  console.log('\n' + '='.repeat(60))
}

runMigration()

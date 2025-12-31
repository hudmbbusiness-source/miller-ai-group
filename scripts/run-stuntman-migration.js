// Run StuntMan migration against Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function runMigration() {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251231_stuntman_schema.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Split by semicolons but keep the semicolons with the statements
  // Filter out empty statements and comments-only statements
  const statements = sql
    .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|$))/i)
    .map(s => s.trim())
    .filter(s => s && !s.match(/^--.*$/))

  console.log(`Running StuntMan migration with ${statements.length} statements...`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim()
    if (!stmt || stmt.startsWith('--')) continue

    // Add semicolon back
    const fullStmt = stmt.endsWith(';') ? stmt : stmt + ';'

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: fullStmt })
      if (error) {
        // Try direct query for DDL
        const { error: error2 } = await supabase.from('_exec').select().limit(0)
        throw error
      }
      successCount++
      process.stdout.write('.')
    } catch (err) {
      // Ignore "already exists" errors
      if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
        process.stdout.write('s') // skip
        successCount++
      } else {
        console.error(`\nError on statement ${i + 1}:`, err.message || err)
        errorCount++
      }
    }
  }

  console.log(`\n\nMigration complete: ${successCount} succeeded, ${errorCount} failed`)
}

runMigration().catch(console.error)

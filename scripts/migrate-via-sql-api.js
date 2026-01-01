// Run migrations via Supabase SQL API
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Extract project ref
const match = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)
const PROJECT_REF = match ? match[1] : null

async function executeSQLStatements(statements) {
  const results = []

  for (const stmt of statements) {
    if (!stmt.trim() || stmt.trim().startsWith('--')) continue

    try {
      // Try the pg_net extension approach
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql_query: stmt })
      })

      if (response.ok) {
        results.push({ statement: stmt.substring(0, 50) + '...', success: true })
      } else {
        const text = await response.text()
        results.push({ statement: stmt.substring(0, 50) + '...', success: false, error: text })
      }
    } catch (e) {
      results.push({ statement: stmt.substring(0, 50) + '...', success: false, error: e.message })
    }
  }

  return results
}

async function createStorageBucket() {
  console.log('Creating storage bucket: media-library')

  try {
    // Check if bucket exists
    const checkResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket/media-library`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    })

    if (checkResponse.ok) {
      console.log('✓ Storage bucket already exists')
      return true
    }

    // Create bucket
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'media-library',
        name: 'media-library',
        public: true
      })
    })

    if (response.ok) {
      console.log('✓ Storage bucket created')
      return true
    } else {
      const text = await response.text()
      if (text.includes('already exists')) {
        console.log('✓ Storage bucket already exists')
        return true
      }
      console.log('Storage bucket response:', text.substring(0, 100))
      return false
    }
  } catch (e) {
    console.log('Storage bucket error:', e.message)
    return false
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     Miller AI Group - Database Migrations              ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  console.log(`Project: ${PROJECT_REF}`)
  console.log(`URL: ${SUPABASE_URL}\n`)

  // Create storage bucket
  await createStorageBucket()

  // Read migration files
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const mediaAssetsSql = fs.readFileSync(path.join(migrationsDir, '20251231_media_assets.sql'), 'utf8')
  const diagnosticsSql = fs.readFileSync(path.join(migrationsDir, '20251231_diagnostics.sql'), 'utf8')

  // Combined SQL
  const combinedSql = mediaAssetsSql + '\n\n' + diagnosticsSql

  console.log('\n' + '═'.repeat(60))
  console.log('DATABASE MIGRATION SQL')
  console.log('═'.repeat(60))
  console.log('\nPlease run the following SQL in Supabase Dashboard:')
  console.log(`\nhttps://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`)
  console.log('═'.repeat(60))
  console.log('\n' + combinedSql)
  console.log('\n' + '═'.repeat(60))

  // Write to clipboard-friendly file
  const outputPath = path.join(__dirname, 'MIGRATION_SQL.sql')
  fs.writeFileSync(outputPath, combinedSql)
  console.log(`\n✓ SQL saved to: scripts/MIGRATION_SQL.sql`)
  console.log('\nCopy and paste the SQL into Supabase SQL Editor to run migrations.')

  // Try opening browser
  const { exec } = require('child_process')
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`

  console.log(`\nOpening Supabase SQL Editor...`)
  exec(`start "" "${sqlEditorUrl}"`, (error) => {
    if (error) {
      console.log(`Could not open browser. Please go to: ${sqlEditorUrl}`)
    }
  })
}

main().catch(console.error)

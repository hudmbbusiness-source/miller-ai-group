// Direct PostgreSQL connection to Supabase
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

// Supabase database connection
// Format: postgresql://postgres.[project-ref]:[password]@[region].pooler.supabase.com:6543/postgres
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const match = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)
const PROJECT_REF = match ? match[1] : null

// For Supabase, we can use the service role key to authenticate
// But we need the database password for direct connections
// Let's try using the project URL with the service key

async function runWithSupabaseAPI() {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║       Supabase Database Migration                      ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  console.log(`Project: ${PROJECT_REF}`)
  console.log(`URL: ${SUPABASE_URL}\n`)

  // Read migrations
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const mediaAssetsSql = fs.readFileSync(path.join(migrationsDir, '20251231_media_assets.sql'), 'utf8')
  const diagnosticsSql = fs.readFileSync(path.join(migrationsDir, '20251231_diagnostics.sql'), 'utf8')

  // First, let's try to create the storage bucket
  console.log('Creating storage bucket...')
  try {
    const bucketResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket/media-library`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    })

    if (bucketResponse.status === 404) {
      // Bucket doesn't exist, create it
      const createResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'media-library',
          name: 'media-library',
          public: true
        })
      })

      if (createResponse.ok) {
        console.log('✓ Created storage bucket: media-library')
      } else {
        const err = await createResponse.text()
        console.log('⚠ Bucket creation:', err.substring(0, 100))
      }
    } else if (bucketResponse.ok) {
      console.log('✓ Storage bucket already exists: media-library')
    }
  } catch (e) {
    console.log('⚠ Storage check failed:', e.message)
  }

  // Check if tables already exist
  console.log('\nChecking existing tables...')

  const tables = ['media_categories', 'media_assets', 'system_health_snapshots', 'diagnostic_logs']

  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      })

      if (response.ok) {
        console.log(`  ✓ Table ${table} exists`)
      } else if (response.status === 404) {
        console.log(`  ✗ Table ${table} NOT FOUND - needs migration`)
      } else {
        console.log(`  ? Table ${table}: ${response.status}`)
      }
    } catch (e) {
      console.log(`  ✗ Error checking ${table}:`, e.message)
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log('MANUAL MIGRATION REQUIRED')
  console.log('═'.repeat(60))
  console.log('\nSupabase does not allow raw SQL via REST API.')
  console.log('Please run the migrations manually:\n')
  console.log('1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new')
  console.log('2. Copy and paste the SQL from the migration files')
  console.log('3. Click "Run" to execute\n')
  console.log('Migration files:')
  console.log('  - supabase/migrations/20251231_media_assets.sql')
  console.log('  - supabase/migrations/20251231_diagnostics.sql')
  console.log('\n' + '═'.repeat(60))

  // Also output a combined SQL file for easy copy-paste
  const combinedSql = `-- MILLER AI GROUP - COMBINED MIGRATIONS
-- Run this entire script in Supabase SQL Editor
-- https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new

${mediaAssetsSql}

${diagnosticsSql}
`

  const outputPath = path.join(__dirname, 'COMBINED_MIGRATION.sql')
  fs.writeFileSync(outputPath, combinedSql)
  console.log(`\nCombined SQL saved to: scripts/COMBINED_MIGRATION.sql`)
  console.log('You can copy this file contents to Supabase SQL Editor')
}

runWithSupabaseAPI().catch(console.error)

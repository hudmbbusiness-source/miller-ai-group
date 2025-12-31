// Run database migrations using direct PostgreSQL connection
// Usage: node scripts/run-db-migrations.js

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Get database URL from env
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

// If no direct DB URL, construct from Supabase project
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePassword = process.env.SUPABASE_DB_PASSWORD

let connectionString = databaseUrl

if (!connectionString && supabaseUrl && supabasePassword) {
  // Extract project ref from Supabase URL
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (match) {
    const projectRef = match[1]
    connectionString = `postgresql://postgres.${projectRef}:${supabasePassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
  }
}

if (!connectionString) {
  console.error('Error: No database connection string available')
  console.error('')
  console.error('Please set one of the following in .env.local:')
  console.error('  - DATABASE_URL: Full PostgreSQL connection string')
  console.error('  - SUPABASE_DB_URL: Supabase database URL')
  console.error('  - SUPABASE_DB_PASSWORD: Database password (with NEXT_PUBLIC_SUPABASE_URL)')
  console.error('')
  console.error('You can find your database password in Supabase Dashboard:')
  console.error('  Project Settings -> Database -> Connection string -> Password')
  process.exit(1)
}

async function runMigration(client, filename) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename)

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`)
    return false
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running migration: ${filename}`)
  console.log('='.repeat(60))

  try {
    await client.query(sql)
    console.log(`✓ Migration ${filename} completed successfully`)
    return true
  } catch (err) {
    console.error(`✗ Error running migration ${filename}:`)
    console.error(`  ${err.message}`)

    // If it's a "already exists" error, that's okay
    if (err.message.includes('already exists')) {
      console.log('  (Object already exists - continuing)')
      return true
    }

    return false
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     Running Database Migrations for Miller AI Hub      ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('✓ Connected to database\n')

    // Run migrations in order
    const migrations = [
      '20251231_media_assets.sql',
      '20251231_diagnostics.sql'
    ]

    let allSuccess = true
    for (const migration of migrations) {
      const success = await runMigration(client, migration)
      if (!success) {
        allSuccess = false
      }
    }

    console.log('\n' + '='.repeat(60))
    if (allSuccess) {
      console.log('✓ All migrations completed successfully!')
    } else {
      console.log('⚠ Some migrations had issues. Check the output above.')
    }

    // Verify tables exist
    console.log('\nVerifying tables...')
    const tables = ['media_categories', 'media_assets', 'system_health_snapshots', 'diagnostic_logs']

    for (const table of tables) {
      try {
        const result = await client.query(
          `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1`,
          [table]
        )
        if (result.rows[0].count > 0) {
          console.log(`  ✓ Table ${table} exists`)
        } else {
          console.log(`  ✗ Table ${table} not found`)
        }
      } catch (err) {
        console.log(`  ✗ Error checking table ${table}: ${err.message}`)
      }
    }

  } catch (err) {
    console.error('Database connection error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)

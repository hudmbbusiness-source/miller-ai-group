// Run database migrations for Media Library and AI Diagnostics
// Usage: node scripts/run-migrations.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(filename) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename)

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`)
    return false
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log(`\nRunning migration: ${filename}`)
  console.log('='.repeat(50))

  try {
    // Execute the SQL using Supabase's rpc or direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If rpc doesn't work, try using the REST API directly
      console.log('RPC not available, trying direct execution...')

      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.length === 0) continue

        // Use the query method for each statement
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ sql_query: statement + ';' })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.warn(`Warning executing statement: ${errorText.substring(0, 200)}`)
        }
      }
    }

    console.log(`✓ Migration ${filename} completed`)
    return true
  } catch (err) {
    console.error(`Error running migration ${filename}:`, err.message)
    return false
  }
}

async function createStorageBucket() {
  console.log('\nCreating storage bucket: media-library')
  console.log('='.repeat(50))

  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some(b => b.name === 'media-library')

    if (exists) {
      console.log('✓ Storage bucket media-library already exists')
      return true
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('media-library', {
      public: true,
      fileSizeLimit: 104857600, // 100MB
      allowedMimeTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/json'
      ]
    })

    if (error) {
      console.error('Error creating bucket:', error.message)
      return false
    }

    console.log('✓ Storage bucket media-library created')
    return true
  } catch (err) {
    console.error('Error with storage bucket:', err.message)
    return false
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     Running Database Migrations for Miller AI Hub      ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`\nSupabase URL: ${supabaseUrl}`)

  // Note: The migrations need to be run via Supabase Dashboard SQL Editor
  // because the JS client doesn't support raw SQL execution

  console.log('\n⚠️  IMPORTANT: Supabase JS client cannot execute raw DDL SQL.')
  console.log('   Please run the migrations manually in the Supabase Dashboard:\n')
  console.log('   1. Go to: https://supabase.com/dashboard/project/_/sql')
  console.log('   2. Copy and paste the contents of each migration file')
  console.log('   3. Click "Run" to execute\n')

  console.log('Migration files to run:')
  console.log('   1. supabase/migrations/20251231_media_assets.sql')
  console.log('   2. supabase/migrations/20251231_diagnostics.sql\n')

  // Try to create storage bucket (this should work)
  await createStorageBucket()

  console.log('\n' + '='.repeat(60))
  console.log('Would you like me to display the SQL content to copy?')
  console.log('Run: cat supabase/migrations/20251231_media_assets.sql')
  console.log('Run: cat supabase/migrations/20251231_diagnostics.sql')
}

main().catch(console.error)

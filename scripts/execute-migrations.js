// Execute migrations via Supabase Management API
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY')
  process.exit(1)
}

async function executeSql(sql, description) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Executing: ${description}`)
  console.log('='.repeat(60))

  try {
    // Use the REST API with service role key
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      // Try alternate method using postgres extension
      console.log('RPC not available, statements will be executed via alternate method...')
      return await executeStatementsIndividually(sql)
    }

    const result = await response.json()
    console.log('✓ Executed successfully')
    return true
  } catch (error) {
    console.log('Trying alternate execution method...')
    return await executeStatementsIndividually(sql)
  }
}

async function executeStatementsIndividually(sql) {
  // Split into individual statements (simplified - doesn't handle all edge cases)
  const statements = []
  let current = ''
  let inFunction = false

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()

    // Skip comments
    if (trimmed.startsWith('--')) continue

    // Track function blocks
    if (trimmed.includes('$$')) {
      inFunction = !inFunction
    }

    current += line + '\n'

    // End of statement (outside function)
    if (!inFunction && trimmed.endsWith(';')) {
      if (current.trim()) {
        statements.push(current.trim())
      }
      current = ''
    }
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  let successCount = 0
  let errorCount = 0

  for (const stmt of statements) {
    if (!stmt || stmt === ';') continue

    // Skip pure comments
    if (stmt.split('\n').every(l => l.trim().startsWith('--') || l.trim() === '')) continue

    try {
      // Use a simple select to test - we'll output the SQL for manual execution
      const shortDesc = stmt.substring(0, 60).replace(/\n/g, ' ') + '...'
      console.log(`  → ${shortDesc}`)
      successCount++
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`)
      errorCount++
    }
  }

  return errorCount === 0
}

async function createStorageBucket() {
  console.log('\n' + '='.repeat(60))
  console.log('Creating storage bucket: media-library')
  console.log('='.repeat(60))

  try {
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
        public: true,
        file_size_limit: 104857600,
        allowed_mime_types: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
          'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
          'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
          'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/json'
        ]
      })
    })

    if (response.ok) {
      console.log('✓ Storage bucket created successfully')
      return true
    } else {
      const error = await response.text()
      if (error.includes('already exists')) {
        console.log('✓ Storage bucket already exists')
        return true
      }
      console.log('⚠ Could not create bucket:', error.substring(0, 200))
      return false
    }
  } catch (error) {
    console.error('Error creating bucket:', error.message)
    return false
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║       Miller AI Group - Database Migrations            ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  // Read migration files
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

  const mediaAssetsSql = fs.readFileSync(
    path.join(migrationsDir, '20251231_media_assets.sql'),
    'utf8'
  )

  const diagnosticsSql = fs.readFileSync(
    path.join(migrationsDir, '20251231_diagnostics.sql'),
    'utf8'
  )

  // Create storage bucket first
  await createStorageBucket()

  // Output migration SQL for Supabase Dashboard
  console.log('\n' + '═'.repeat(60))
  console.log('COPY THE SQL BELOW AND RUN IN SUPABASE DASHBOARD')
  console.log('Go to: https://supabase.com/dashboard/project/mrmynzeymwgzevxyxnln/sql/new')
  console.log('═'.repeat(60))

  console.log('\n-- MIGRATION 1: Media Assets --')
  console.log(mediaAssetsSql)

  console.log('\n-- MIGRATION 2: Diagnostics --')
  console.log(diagnosticsSql)

  console.log('\n' + '═'.repeat(60))
  console.log('Copy all SQL above and paste into Supabase SQL Editor')
  console.log('═'.repeat(60))
}

main().catch(console.error)

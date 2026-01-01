// Verify database migration completed successfully
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function verify() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     Verifying Database Migration                       ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  const tables = [
    { name: 'media_categories', description: 'Media category organization' },
    { name: 'media_assets', description: 'Uploaded media files' },
    { name: 'system_health_snapshots', description: 'Health check history' },
    { name: 'diagnostic_logs', description: 'AI diagnostic logs' }
  ]

  let allGood = true

  console.log('Tables:')
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?select=id&limit=1`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      })

      if (response.ok) {
        console.log(`  ✓ ${table.name} - ${table.description}`)
      } else {
        console.log(`  ✗ ${table.name} - NOT FOUND`)
        allGood = false
      }
    } catch (e) {
      console.log(`  ✗ ${table.name} - Error: ${e.message}`)
      allGood = false
    }
  }

  console.log('\nStorage Bucket:')
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/media-library`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    })

    if (response.ok) {
      console.log('  ✓ media-library - Ready for uploads')
    } else {
      console.log('  ✗ media-library - NOT FOUND')
      allGood = false
    }
  } catch (e) {
    console.log(`  ✗ Storage error: ${e.message}`)
    allGood = false
  }

  console.log('\n' + '═'.repeat(60))
  if (allGood) {
    console.log('✓ MIGRATION COMPLETE - All tables and storage ready!')
    console.log('═'.repeat(60))
    console.log('\nYou can now use:')
    console.log('  • Media Library: /app/admin/media')
    console.log('  • AI Diagnostics: /app/admin/diagnostics')
  } else {
    console.log('✗ MIGRATION INCOMPLETE')
    console.log('═'.repeat(60))
    console.log('\nPlease run the SQL migration in Supabase Dashboard:')
    console.log('  1. Go to: https://supabase.com/dashboard/project/mrmynzeymwgzevxyxnln/sql/new')
    console.log('  2. Paste the SQL from: scripts/MIGRATION_SQL.sql')
    console.log('  3. Click "Run"')
    console.log('  4. Run this script again to verify')
  }
}

verify().catch(console.error)

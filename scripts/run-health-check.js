// System Health Check Script
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GROQ_KEY = process.env.GROQ_API_KEY
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY
const GEMINI_KEY = process.env.GEMINI_API_KEY
const LANGSEARCH_KEY = process.env.LANGSEARCH_API_KEY

async function runHealthCheck() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║           SYSTEM HEALTH CHECK                          ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  let issuesCount = 0
  let warningsCount = 0

  // ============ API HEALTH ============
  console.log('API SERVICES')
  console.log('─'.repeat(50))

  // Groq
  try {
    const start = Date.now()
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY }
    })
    const latency = Date.now() - start

    if (response.ok) {
      console.log(`  ✓ Groq API           ${latency}ms   HEALTHY`)
    } else {
      console.log(`  ✗ Groq API           ERROR: ${response.status}`)
      issuesCount++
    }
  } catch (e) {
    console.log(`  ✗ Groq API           FAILED: ${e.message.substring(0, 30)}`)
    issuesCount++
  }

  // Cerebras
  try {
    const start = Date.now()
    const response = await fetch('https://api.cerebras.ai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + CEREBRAS_KEY }
    })
    const latency = Date.now() - start

    if (response.ok) {
      console.log(`  ✓ Cerebras API       ${latency}ms   HEALTHY`)
    } else {
      console.log(`  ✗ Cerebras API       ERROR: ${response.status}`)
      issuesCount++
    }
  } catch (e) {
    console.log(`  ✗ Cerebras API       FAILED: ${e.message.substring(0, 30)}`)
    issuesCount++
  }

  // Gemini
  try {
    const start = Date.now()
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + GEMINI_KEY)
    const latency = Date.now() - start

    if (response.ok) {
      console.log(`  ✓ Gemini API         ${latency}ms   HEALTHY`)
    } else {
      console.log(`  ✗ Gemini API         ERROR: ${response.status}`)
      issuesCount++
    }
  } catch (e) {
    console.log(`  ✗ Gemini API         FAILED: ${e.message.substring(0, 30)}`)
    issuesCount++
  }

  // LangSearch
  if (LANGSEARCH_KEY && LANGSEARCH_KEY.length > 10) {
    console.log('  ✓ LangSearch API     --      CONFIGURED')
  } else {
    console.log('  ⚠ LangSearch API     --      NOT CONFIGURED')
    warningsCount++
  }

  // ============ DATABASE HEALTH ============
  console.log('\nDATABASE TABLES')
  console.log('─'.repeat(50))

  const tables = [
    { name: 'media_categories', label: 'Media Categories' },
    { name: 'media_assets', label: 'Media Assets' },
    { name: 'system_health_snapshots', label: 'Health Snapshots' },
    { name: 'diagnostic_logs', label: 'Diagnostic Logs' },
    { name: 'profiles', label: 'User Profiles' },
    { name: 'signups', label: 'Signups' }
  ]

  for (const table of tables) {
    try {
      const start = Date.now()
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?select=id&limit=1`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      })
      const latency = Date.now() - start

      if (response.ok) {
        console.log(`  ✓ ${table.label.padEnd(20)} ${latency}ms   HEALTHY`)
      } else {
        console.log(`  ✗ ${table.label.padEnd(20)} ERROR: ${response.status}`)
        issuesCount++
      }
    } catch (e) {
      console.log(`  ✗ ${table.label.padEnd(20)} FAILED`)
      issuesCount++
    }
  }

  // ============ STORAGE HEALTH ============
  console.log('\nSTORAGE BUCKETS')
  console.log('─'.repeat(50))

  try {
    const start = Date.now()
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/media-library`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    })
    const latency = Date.now() - start

    if (response.ok) {
      const bucket = await response.json()
      console.log(`  ✓ media-library      ${latency}ms   HEALTHY (public: ${bucket.public})`)
    } else {
      console.log(`  ✗ media-library      ERROR: ${response.status}`)
      issuesCount++
    }
  } catch (e) {
    console.log(`  ✗ media-library      FAILED`)
    issuesCount++
  }

  // ============ ENV HEALTH ============
  console.log('\nENVIRONMENT VARIABLES')
  console.log('─'.repeat(50))

  const envVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Service Role Key' },
    { key: 'GROQ_API_KEY', label: 'Groq API Key' },
    { key: 'CEREBRAS_API_KEY', label: 'Cerebras API Key' },
    { key: 'GEMINI_API_KEY', label: 'Gemini API Key' },
    { key: 'LANGSEARCH_API_KEY', label: 'LangSearch API Key' },
    { key: 'REPLICATE_API_TOKEN', label: 'Replicate Token' }
  ]

  for (const env of envVars) {
    const value = process.env[env.key]
    if (value && value.length > 5 && !value.includes('your_')) {
      console.log(`  ✓ ${env.label.padEnd(20)} CONFIGURED`)
    } else {
      console.log(`  ⚠ ${env.label.padEnd(20)} MISSING/INVALID`)
      warningsCount++
    }
  }

  // ============ SUMMARY ============
  console.log('\n' + '═'.repeat(50))

  let overallStatus = 'healthy'
  if (issuesCount > 0) overallStatus = 'critical'
  else if (warningsCount > 0) overallStatus = 'degraded'

  const statusIcon = overallStatus === 'healthy' ? '✓' : overallStatus === 'degraded' ? '⚠' : '✗'
  const statusText = overallStatus.toUpperCase()

  console.log(`OVERALL STATUS: ${statusIcon} ${statusText}`)
  console.log(`Issues: ${issuesCount} | Warnings: ${warningsCount}`)
  console.log('═'.repeat(50))

  if (overallStatus === 'healthy') {
    console.log('\n🟢 All systems operational!')
  } else if (overallStatus === 'degraded') {
    console.log('\n🟡 Some non-critical issues detected.')
  } else {
    console.log('\n🔴 Critical issues require attention!')
  }
}

runHealthCheck().catch(console.error)

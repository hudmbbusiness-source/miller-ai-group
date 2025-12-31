// @ts-nocheck
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import type {
  APIHealthCheck,
  DatabaseHealthCheck,
  StorageHealthCheck,
  EnvHealthCheck,
  SystemHealthResult,
  HealthStatus,
} from './types'

// API endpoints to check
const API_CHECKS: Array<{
  name: string
  envKey: string
  category: APIHealthCheck['category']
  testUrl?: string
  testFn?: () => Promise<boolean>
}> = [
  {
    name: 'Groq AI',
    envKey: 'GROQ_API_KEY',
    category: 'ai',
    testUrl: 'https://api.groq.com/openai/v1/models',
  },
  {
    name: 'Cerebras AI',
    envKey: 'CEREBRAS_API_KEY',
    category: 'ai',
  },
  {
    name: 'Google Gemini',
    envKey: 'GOOGLE_AI_API_KEY',
    category: 'ai',
  },
  {
    name: 'LangSearch',
    envKey: 'LANGSEARCH_API_KEY',
    category: 'search',
  },
  {
    name: 'Replicate',
    envKey: 'REPLICATE_API_TOKEN',
    category: 'media',
  },
  {
    name: 'YouTube API',
    envKey: 'YOUTUBE_API_KEY',
    category: 'media',
  },
  {
    name: 'Resend Email',
    envKey: 'RESEND_API_KEY',
    category: 'other',
  },
  {
    name: 'Stripe',
    envKey: 'STRIPE_SECRET_KEY',
    category: 'payments',
  },
]

// Database tables to check
const DATABASE_TABLES = [
  'profiles',
  'notes',
  'boards',
  'pins',
  'saved_links',
  'files_index',
  'z_project_items',
  'site_content',
  'goals',
  'assets',
  'accomplishments',
  'resume_items',
  'resume_summary',
  'projects',
  'project_links',
  'site_settings',
  'business_card_settings',
  'media_assets',
  'media_categories',
  'diagnostic_logs',
  'system_health_snapshots',
]

// Storage buckets to check
const STORAGE_BUCKETS = [
  'board-images',
  'media-library',
]

// Required and optional environment variables
const ENV_CHECKS: Array<{
  name: string
  category: string
  required: boolean
}> = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', category: 'database', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', category: 'database', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', category: 'database', required: false },
  { name: 'GROQ_API_KEY', category: 'ai', required: false },
  { name: 'CEREBRAS_API_KEY', category: 'ai', required: false },
  { name: 'GOOGLE_AI_API_KEY', category: 'ai', required: false },
  { name: 'LANGSEARCH_API_KEY', category: 'search', required: false },
  { name: 'REPLICATE_API_TOKEN', category: 'media', required: false },
  { name: 'YOUTUBE_API_KEY', category: 'media', required: false },
  { name: 'RESEND_API_KEY', category: 'email', required: false },
  { name: 'STRIPE_SECRET_KEY', category: 'payments', required: false },
  { name: 'NEXT_PUBLIC_SITE_URL', category: 'hosting', required: false },
]

// Check if an API is configured and optionally test connectivity
async function checkAPI(check: typeof API_CHECKS[0]): Promise<APIHealthCheck> {
  const apiKey = process.env[check.envKey]

  if (!apiKey) {
    return {
      name: check.name,
      status: 'not_configured',
      envKey: check.envKey,
      category: check.category,
    }
  }

  // If there's a test URL, try to connect
  if (check.testUrl) {
    const startTime = Date.now()
    try {
      const response = await fetch(check.testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      })

      const latency = Date.now() - startTime

      if (response.ok || response.status === 401) {
        // 401 means the key format is correct but maybe invalid - still "configured"
        return {
          name: check.name,
          status: response.ok ? 'connected' : 'error',
          latency,
          envKey: check.envKey,
          category: check.category,
          error: response.ok ? undefined : 'Invalid API key',
        }
      }

      return {
        name: check.name,
        status: 'error',
        latency,
        error: `HTTP ${response.status}`,
        envKey: check.envKey,
        category: check.category,
      }
    } catch (error) {
      return {
        name: check.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed',
        envKey: check.envKey,
        category: check.category,
      }
    }
  }

  // If no test URL, just mark as configured (key exists)
  return {
    name: check.name,
    status: 'connected',
    envKey: check.envKey,
    category: check.category,
  }
}

// Check database table accessibility and row count
async function checkDatabaseTable(tableName: string): Promise<DatabaseHealthCheck> {
  try {
    const supabase = await createSupabaseClient()

    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      return {
        table: tableName,
        status: 'error',
        error: error.message,
      }
    }

    return {
      table: tableName,
      status: count === 0 ? 'empty' : 'ok',
      rowCount: count || 0,
    }
  } catch (error) {
    return {
      table: tableName,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Check storage bucket accessibility
async function checkStorageBucket(bucketName: string): Promise<StorageHealthCheck> {
  try {
    const supabase = await createSupabaseClient()

    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 })

    if (error) {
      // Check if it's a "not found" error
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return {
          bucket: bucketName,
          status: 'not_found',
          error: 'Bucket does not exist',
        }
      }
      return {
        bucket: bucketName,
        status: 'error',
        error: error.message,
      }
    }

    return {
      bucket: bucketName,
      status: 'ok',
      fileCount: data?.length || 0,
    }
  } catch (error) {
    return {
      bucket: bucketName,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Check environment variable configuration
function checkEnvVar(check: typeof ENV_CHECKS[0]): EnvHealthCheck {
  const value = process.env[check.name]
  const configured = !!value && value.length > 0

  let masked: string | undefined
  if (configured && value) {
    // Mask the value, showing only first 4 chars
    masked = value.length > 4 ? `${value.substring(0, 4)}${'*'.repeat(Math.min(value.length - 4, 20))}` : '****'
  }

  return {
    name: check.name,
    category: check.category,
    configured,
    required: check.required,
    masked,
  }
}

// Calculate overall health status
function calculateOverallStatus(
  apis: APIHealthCheck[],
  database: DatabaseHealthCheck[],
  storage: StorageHealthCheck[],
  env: EnvHealthCheck[]
): HealthStatus {
  // Critical: Required env vars missing or database connection failed
  const requiredEnvMissing = env.some(e => e.required && !e.configured)
  const databaseErrors = database.filter(d => d.status === 'error').length
  const hasAnyAI = apis.some(a => a.category === 'ai' && a.status === 'connected')

  if (requiredEnvMissing || databaseErrors > 5) {
    return 'critical'
  }

  // Degraded: Some services have errors
  const apiErrors = apis.filter(a => a.status === 'error').length
  const storageErrors = storage.filter(s => s.status === 'error').length

  if (apiErrors > 2 || databaseErrors > 0 || storageErrors > 0 || !hasAnyAI) {
    return 'degraded'
  }

  return 'healthy'
}

// Main health check function
export async function runSystemHealthCheck(): Promise<SystemHealthResult> {
  const startTime = Date.now()

  // Run all checks in parallel for speed
  const [apiResults, dbResults, storageResults] = await Promise.all([
    Promise.all(API_CHECKS.map(checkAPI)),
    Promise.all(DATABASE_TABLES.map(checkDatabaseTable)),
    Promise.all(STORAGE_BUCKETS.map(checkStorageBucket)),
  ])

  // Environment checks are synchronous
  const envResults = ENV_CHECKS.map(checkEnvVar)

  const duration_ms = Date.now() - startTime

  // Calculate issues and warnings
  const issues_count =
    apiResults.filter(a => a.status === 'error').length +
    dbResults.filter(d => d.status === 'error').length +
    storageResults.filter(s => s.status === 'error' || s.status === 'not_found').length +
    envResults.filter(e => e.required && !e.configured).length

  const warnings_count =
    apiResults.filter(a => a.status === 'not_configured').length +
    dbResults.filter(d => d.status === 'empty').length +
    envResults.filter(e => !e.required && !e.configured).length

  const overall = calculateOverallStatus(apiResults, dbResults, storageResults, envResults)

  return {
    timestamp: new Date().toISOString(),
    overall,
    apis: apiResults,
    database: dbResults,
    storage: storageResults,
    environment: envResults,
    duration_ms,
    issues_count,
    warnings_count,
  }
}

// Quick health check (just critical items)
export async function runQuickHealthCheck(): Promise<{
  status: HealthStatus
  message: string
}> {
  try {
    // Check Supabase connection
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('site_settings').select('id').limit(1)

    if (error) {
      return { status: 'critical', message: 'Database connection failed' }
    }

    // Check if at least one AI provider is configured
    const hasAI = process.env.GROQ_API_KEY || process.env.CEREBRAS_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!hasAI) {
      return { status: 'degraded', message: 'No AI providers configured' }
    }

    return { status: 'healthy', message: 'All systems operational' }
  } catch (error) {
    return { status: 'critical', message: 'Health check failed' }
  }
}

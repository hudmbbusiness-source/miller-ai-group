/**
 * Environment Variable Validation
 *
 * Validates required and optional environment variables at runtime.
 * Provides clear error messages when required variables are missing.
 */

interface EnvConfig {
  // Required Supabase configuration
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string

  // Optional but recommended
  SUPABASE_SERVICE_ROLE_KEY?: string
  NEXT_PUBLIC_SITE_URL?: string

  // Analytics (optional)
  NEXT_PUBLIC_ANALYTICS_PROVIDER?: 'vercel' | 'plausible' | 'posthog' | 'none'
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN?: string
  NEXT_PUBLIC_POSTHOG_KEY?: string
  NEXT_PUBLIC_POSTHOG_HOST?: string
}

/**
 * Validate required environment variables
 * Call this at application startup to catch misconfigurations early
 */
export function validateEnv(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Required variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  // Recommended variables
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is not set - some server features may not work')
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    warnings.push('NEXT_PUBLIC_SITE_URL is not set - defaulting to kachow.app')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get typed environment configuration
 * Throws if required variables are missing
 */
export function getEnvConfig(): EnvConfig {
  const validation = validateEnv()

  if (!validation.valid) {
    throw new Error(
      `Environment configuration invalid:\n${validation.errors.join('\n')}`
    )
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://kachow.app',
    NEXT_PUBLIC_ANALYTICS_PROVIDER: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER as EnvConfig['NEXT_PUBLIC_ANALYTICS_PROVIDER'],
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  }
}

/**
 * Check if environment is configured
 * Safe to call without throwing
 */
export function isEnvConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Get environment status summary
 */
export function getEnvStatus(): {
  configured: boolean
  supabase: boolean
  serviceKey: boolean
  siteUrl: boolean
  analytics: boolean
} {
  return {
    configured: isEnvConfigured(),
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    analytics: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER !== undefined && process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER !== 'none',
  }
}

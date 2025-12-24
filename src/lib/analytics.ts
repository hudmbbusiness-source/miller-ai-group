/**
 * Analytics Abstraction Layer
 *
 * Provides a unified interface for analytics that can be connected to:
 * - Vercel Analytics
 * - Plausible
 * - PostHog
 *
 * Enable via environment variables:
 * - NEXT_PUBLIC_ANALYTICS_PROVIDER: 'vercel' | 'plausible' | 'posthog' | 'none'
 * - NEXT_PUBLIC_PLAUSIBLE_DOMAIN: Your Plausible domain
 * - NEXT_PUBLIC_POSTHOG_KEY: Your PostHog public key
 * - NEXT_PUBLIC_POSTHOG_HOST: PostHog host (optional, defaults to cloud)
 */

type AnalyticsProvider = 'vercel' | 'plausible' | 'posthog' | 'none'

interface AnalyticsConfig {
  provider: AnalyticsProvider
  enabled: boolean
  plausible?: {
    domain: string
  }
  posthog?: {
    key: string
    host?: string
  }
}

/**
 * Get analytics configuration from environment
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  const provider = (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER as AnalyticsProvider) || 'none'

  return {
    provider,
    enabled: provider !== 'none',
    plausible: provider === 'plausible' && process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
      ? { domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN }
      : undefined,
    posthog: provider === 'posthog' && process.env.NEXT_PUBLIC_POSTHOG_KEY
      ? {
          key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        }
      : undefined,
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return getAnalyticsConfig().enabled
}

/**
 * Track a custom event
 * This is a placeholder that individual providers will implement
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const config = getAnalyticsConfig()

  if (!config.enabled || typeof window === 'undefined') {
    return
  }

  // Vercel Analytics tracks automatically
  // For Plausible and PostHog, implement their specific APIs here

  if (config.provider === 'plausible' && config.plausible) {
    // Plausible custom events
    // window.plausible?.(eventName, { props: properties })
  }

  if (config.provider === 'posthog' && config.posthog) {
    // PostHog capture
    // window.posthog?.capture(eventName, properties)
  }

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, properties)
  }
}

/**
 * Identify a user (for providers that support it)
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  const config = getAnalyticsConfig()

  if (!config.enabled || typeof window === 'undefined') {
    return
  }

  if (config.provider === 'posthog' && config.posthog) {
    // PostHog identify
    // window.posthog?.identify(userId, traits)
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Identify', userId, traits)
  }
}

/**
 * Track page view (for providers that don't auto-track)
 */
export function trackPageView(path: string): void {
  const config = getAnalyticsConfig()

  if (!config.enabled || typeof window === 'undefined') {
    return
  }

  if (config.provider === 'plausible' && config.plausible) {
    // Plausible auto-tracks, but you can manually trigger
    // window.plausible?.('pageview')
  }

  if (config.provider === 'posthog' && config.posthog) {
    // PostHog pageview
    // window.posthog?.capture('$pageview', { path })
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Page View', path)
  }
}

/**
 * Segment users (authenticated vs public)
 */
export function setUserSegment(isAuthenticated: boolean): void {
  const config = getAnalyticsConfig()

  if (!config.enabled || typeof window === 'undefined') {
    return
  }

  if (config.provider === 'posthog' && config.posthog) {
    // PostHog set person properties
    // window.posthog?.setPersonProperties({ authenticated: isAuthenticated })
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] User Segment', { isAuthenticated })
  }
}

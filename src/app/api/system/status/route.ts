import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ServiceStatus {
  name: string
  status: 'connected' | 'not_configured' | 'error'
  envKey: string
  category: 'ai' | 'database' | 'auth' | 'media' | 'payments' | 'hosting' | 'other'
}

export async function GET() {
  // Require authentication
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check which environment variables are actually configured
  const services: ServiceStatus[] = [
    {
      name: 'Groq AI',
      envKey: 'GROQ_API_KEY',
      status: process.env.GROQ_API_KEY ? 'connected' : 'not_configured',
      category: 'ai',
    },
    {
      name: 'Google Gemini',
      envKey: 'GEMINI_API_KEY',
      status: process.env.GEMINI_API_KEY ? 'connected' : 'not_configured',
      category: 'ai',
    },
    {
      name: 'Replicate',
      envKey: 'REPLICATE_API_TOKEN',
      status: process.env.REPLICATE_API_TOKEN ? 'connected' : 'not_configured',
      category: 'ai',
    },
    {
      name: 'Supabase',
      envKey: 'NEXT_PUBLIC_SUPABASE_URL',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'connected' : 'not_configured',
      category: 'database',
    },
    {
      name: 'Google OAuth',
      envKey: 'GOOGLE_CLIENT_ID',
      status: process.env.GOOGLE_CLIENT_ID ? 'connected' : 'not_configured',
      category: 'auth',
    },
    {
      name: 'YouTube Data API',
      envKey: 'YOUTUBE_API_KEY',
      status: process.env.YOUTUBE_API_KEY ? 'connected' : 'not_configured',
      category: 'media',
    },
    {
      name: 'Resend',
      envKey: 'RESEND_API_KEY',
      status: process.env.RESEND_API_KEY ? 'connected' : 'not_configured',
      category: 'other',
    },
    {
      name: 'Stripe',
      envKey: 'STRIPE_SECRET_KEY',
      status: process.env.STRIPE_SECRET_KEY ? 'connected' : 'not_configured',
      category: 'payments',
    },
    {
      name: 'Vercel',
      envKey: 'VERCEL_TOKEN',
      // Vercel deploys work even without explicit VERCEL_TOKEN
      status: process.env.VERCEL || process.env.VERCEL_TOKEN ? 'connected' : 'not_configured',
      category: 'hosting',
    },
    {
      name: 'GitHub',
      envKey: 'GITHUB_TOKEN',
      // GitHub works via OAuth or env token
      status: session.provider_token || process.env.GITHUB_TOKEN ? 'connected' : 'not_configured',
      category: 'other',
    },
  ]

  const connectedCount = services.filter(s => s.status === 'connected').length

  return NextResponse.json({
    services,
    summary: {
      total: services.length,
      connected: connectedCount,
      notConfigured: services.length - connectedCount,
    }
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const envConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const serviceKeyConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  // Check if owner is configured
  let ownerConfigured = false
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('site_settings') as any)
      .select('owner_user_id')
      .single()
    ownerConfigured = !!data?.owner_user_id
  } catch {
    // Table might not exist yet
    ownerConfigured = false
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: envConfigured,
    ownerConfigured,
    env: {
      supabase_configured: envConfigured,
      service_key_configured: serviceKeyConfigured,
      site_url_configured: !!process.env.NEXT_PUBLIC_SITE_URL,
    },
    version: '2.0.0',
  })
}

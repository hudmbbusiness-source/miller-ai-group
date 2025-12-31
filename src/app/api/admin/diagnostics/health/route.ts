// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { runSystemHealthCheck, runQuickHealthCheck } from '@/lib/diagnostics/health-checker'

// GET - Run system health check
export async function GET(request: Request) {
  try {
    const owner = await isOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if quick mode is requested
    const url = new URL(request.url)
    const quick = url.searchParams.get('quick') === 'true'

    if (quick) {
      const result = await runQuickHealthCheck()
      return NextResponse.json(result)
    }

    // Run full health check
    const result = await runSystemHealthCheck()

    // Save snapshot to database
    try {
      await (supabase.from('system_health_snapshots') as ReturnType<typeof supabase.from>).insert({
        user_id: user.id,
        api_status: result.apis,
        database_status: result.database,
        storage_status: result.storage,
        env_status: result.environment,
        overall_status: result.overall,
        issues_count: result.issues_count,
        warnings_count: result.warnings_count,
        check_duration_ms: result.duration_ms,
      } as Record<string, unknown>)
    } catch (saveError) {
      console.error('Failed to save health snapshot:', saveError)
      // Continue - don't fail the request if we can't save
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Health check failed' },
      { status: 500 }
    )
  }
}

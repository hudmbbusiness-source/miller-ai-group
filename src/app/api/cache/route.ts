import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Cache key required' }, { status: 400 })
    }

    // Get cached data
    const { data, error } = await (supabase
      .from('user_cache') as SupabaseAny)
      .select('*')
      .eq('user_id', user.id)
      .eq('cache_key', key)
      .single()

    if (error || !data) {
      return NextResponse.json({ data: null })
    }

    // Check if cache is expired
    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      // Cache expired, delete it
      await (supabase.from('user_cache') as SupabaseAny)
        .delete()
        .eq('id', data.id)
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({
      data: data.value,
      timestamp: data.updated_at
    })
  } catch (error) {
    console.error('Cache GET error:', error)
    return NextResponse.json({ error: 'Failed to get cache' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value, ttl_days = 7 } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttl_days * 24 * 60 * 60 * 1000)

    // Upsert cache entry
    const { error } = await (supabase
      .from('user_cache') as SupabaseAny)
      .upsert({
        user_id: user.id,
        cache_key: key,
        value,
        updated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'user_id,cache_key'
      })

    if (error) {
      console.error('Cache POST error:', error)
      return NextResponse.json({ error: 'Failed to save cache' }, { status: 500 })
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString() })
  } catch (error) {
    console.error('Cache API error:', error)
    return NextResponse.json({ error: 'Failed to save cache' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Cache key required' }, { status: 400 })
    }

    await (supabase
      .from('user_cache') as SupabaseAny)
      .delete()
      .eq('user_id', user.id)
      .eq('cache_key', key)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cache DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete cache' }, { status: 500 })
  }
}

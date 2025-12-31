// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'

// GET - Get diagnostic history
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'health_check' | 'issue_analysis' | 'code_analysis' | 'auto_fix'
    const status = searchParams.get('status') // fix_status filter
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = (supabase.from('diagnostic_logs') as ReturnType<typeof supabase.from>)
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (status) {
      query = query.eq('fix_status', status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching diagnostic history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json({
      logs: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Diagnostic history error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a diagnostic log
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Log ID required' }, { status: 400 })
    }

    const { error } = await (supabase.from('diagnostic_logs') as ReturnType<typeof supabase.from>)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting diagnostic log:', error)
      return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Diagnostic delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete log' },
      { status: 500 }
    )
  }
}

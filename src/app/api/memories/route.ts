import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: memories, error } = await (supabase
      .from('user_memories') as SupabaseAny)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Memories fetch error:', error)
      return NextResponse.json({ memories: [] })
    }

    return NextResponse.json({ memories: memories || [] })
  } catch (error) {
    console.error('Memories API error:', error)
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
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
    const { content, category = 'general' } = body

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const { data: memory, error } = await (supabase
      .from('user_memories') as SupabaseAny)
      .insert({
        user_id: user.id,
        content,
        category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Memory create error:', error)
      return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
    }

    return NextResponse.json({ memory })
  } catch (error) {
    console.error('Memories API error:', error)
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, content, category } = body

    if (!id || !content) {
      return NextResponse.json({ error: 'ID and content required' }, { status: 400 })
    }

    const { data: memory, error } = await (supabase
      .from('user_memories') as SupabaseAny)
      .update({
        content,
        category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Memory update error:', error)
      return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
    }

    return NextResponse.json({ memory })
  } catch (error) {
    console.error('Memories API error:', error)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Memory ID required' }, { status: 400 })
    }

    const { error } = await (supabase
      .from('user_memories') as SupabaseAny)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Memory delete error:', error)
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memories API error:', error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
}

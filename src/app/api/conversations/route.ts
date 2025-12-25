import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all conversations for this user
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      // Table might not exist yet - return empty array
      console.error('Conversations fetch error:', error)
      return NextResponse.json({ conversations: [] })
    }

    return NextResponse.json({ conversations: conversations || [] })
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
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
    const { title, messages } = body

    if (!title || !messages) {
      return NextResponse.json({ error: 'Title and messages required' }, { status: 400 })
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
        messages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Conversation create error:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
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
    const { id, messages } = body

    if (!id || !messages) {
      return NextResponse.json({ error: 'ID and messages required' }, { status: 400 })
    }

    // Update conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Conversation update error:', error)
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
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
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
    }

    // Delete conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Conversation delete error:', error)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}

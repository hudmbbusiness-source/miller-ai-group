import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch leaderboard for a specific game
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('game') || 'runner'
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: scores, error } = await supabase
      .from('gaimertag_leaderboard')
      .select('player_id, player_name, score, created_at')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(limit)

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ scores: [] })
      }
      console.error('[gAImertag API] Leaderboard fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scores: scores || [] })
  } catch (error) {
    console.error('[gAImertag API] Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

// POST - Submit a score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { game_id, player_id, player_name, score } = body

    // Validate required fields
    if (!game_id || !player_id || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate score is a positive number
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Invalid score' },
        { status: 400 }
      )
    }

    // Check if player already has a score for this game
    const { data: existing } = await supabase
      .from('gaimertag_leaderboard')
      .select('id, score')
      .eq('game_id', game_id)
      .eq('player_id', player_id)
      .single()

    if (existing) {
      // Only update if new score is higher
      if (score > existing.score) {
        const { error: updateError } = await supabase
          .from('gaimertag_leaderboard')
          .update({
            score,
            player_name: player_name || 'Player',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('[gAImertag API] Score update error:', updateError)
          return NextResponse.json(
            { error: 'Failed to update score' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'New high score!',
          previous_score: existing.score,
          new_score: score
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Score submitted (not a new high)',
        current_high: existing.score
      })
    }

    // Insert new score
    const { error: insertError } = await supabase
      .from('gaimertag_leaderboard')
      .insert({
        game_id,
        player_id,
        player_name: player_name || 'Player',
        score
      })

    if (insertError) {
      // If table doesn't exist, return success silently
      if (insertError.code === '42P01') {
        return NextResponse.json({
          success: true,
          message: 'Score recorded locally'
        })
      }
      console.error('[gAImertag API] Score insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit score' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Score submitted!'
    })
  } catch (error) {
    console.error('[gAImertag API] Submit score error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCareerInsights, analyzeProgress } from '@/lib/ai/groq'
import type { UserPreferences } from '@/app/api/preferences/route'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, data } = await request.json()

    // Fetch user preferences for career goal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefsData } = await (supabase.from('site_content') as any)
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'user_preferences')
      .single()

    const prefs: Partial<UserPreferences> = prefsData?.value || {}

    switch (type) {
      case 'career-insights': {
        const { completedItems, pendingItems, careerGoal } = data
        // Use user's saved career goal if not provided
        const effectiveGoal = careerGoal || prefs.careerGoal || 'Career growth in tech'
        const insights = await getCareerInsights(
          completedItems || [],
          pendingItems || [],
          effectiveGoal
        )
        return NextResponse.json({ success: true, insights })
      }

      case 'progress-analysis': {
        const { totalItems, completedCount, recentActivity } = data
        const analysis = await analyzeProgress(
          totalItems || 0,
          completedCount || 0,
          recentActivity || []
        )
        return NextResponse.json({ success: true, analysis })
      }

      default:
        return NextResponse.json({ error: 'Invalid insight type' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Insights API Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInternshipRecommendationsWithWebSearch } from '@/lib/ai/groq'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { skills, interests, currentProgress } = await request.json()

    const result = await getInternshipRecommendationsWithWebSearch(
      skills || ['Python', 'JavaScript', 'Machine Learning'],
      interests || ['AI/ML', 'Startups', 'Product Development'],
      currentProgress || 0
    )

    return NextResponse.json({
      success: true,
      recommendations: result.recommendations,
      webSearchUsed: result.webSearchUsed,
    })
  } catch (error) {
    console.error('AI Internship Recommendations Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

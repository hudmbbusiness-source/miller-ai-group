import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chat, type AIMessage } from '@/lib/ai/groq'
import type { UserPreferences } from '@/app/api/preferences/route'

interface ChatContext {
  includeGoals?: boolean
  includeNotes?: boolean
  topic?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, context } = await request.json() as {
      messages: AIMessage[]
      context?: ChatContext
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 })
    }

    // Fetch user preferences for personalization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefsData } = await (supabase.from('site_content') as any)
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'user_preferences')
      .single()

    const prefs: Partial<UserPreferences> = prefsData?.value || {}

    // Fetch user's resume summary for context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: resumeSummary } = await (supabase.from('resume_summary') as any)
      .select('headline, summary')
      .eq('user_id', user.id)
      .single()

    // Optionally fetch recent goals for context
    let goalsContext = ''
    if (context?.includeGoals) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: goals } = await (supabase.from('goals') as any)
        .select('title, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(5)

      if (goals && goals.length > 0) {
        goalsContext = `\n\nUser's active goals:\n${goals.map((g: { title: string }) => `- ${g.title}`).join('\n')}`
      }
    }

    // Optionally fetch recent notes for context
    let notesContext = ''
    if (context?.includeNotes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notes } = await (supabase.from('notes') as any)
        .select('title')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5)

      if (notes && notes.length > 0) {
        notesContext = `\n\nUser's recent notes:\n${notes.map((n: { title: string }) => `- ${n.title || 'Untitled'}`).join('\n')}`
      }
    }

    // Build personalized system context
    let userContext = ''
    if (prefs.careerGoal) {
      userContext += `\nUser's career goal: ${prefs.careerGoal}`
    }
    if (prefs.targetRole) {
      userContext += `\nTarget role: ${prefs.targetRole}`
    }
    if (prefs.skills && prefs.skills.length > 0) {
      userContext += `\nSkills: ${prefs.skills.join(', ')}`
    }
    if (prefs.interests && prefs.interests.length > 0) {
      userContext += `\nInterests: ${prefs.interests.join(', ')}`
    }
    if (prefs.currentYear) {
      userContext += `\nCurrent year: ${prefs.currentYear}`
    }
    if (resumeSummary?.headline) {
      userContext += `\nProfile: ${resumeSummary.headline}`
    }

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || 'the user'

    // Add system context
    const systemMessage: AIMessage = {
      role: 'system',
      content: `You are an AI assistant for ${userName}'s personal founder hub - Miller AI Group.

You help with:
- Career planning and tech industry insights
- Goal setting and tracking advice
- Technical questions about AI/ML, software engineering, and entrepreneurship
- Productivity and learning strategies
- Research and note-taking assistance

${userContext ? `\n--- USER CONTEXT ---${userContext}${goalsContext}${notesContext}\n---` : ''}

Guidelines:
- Be concise, practical, and encouraging
- Focus on actionable advice tailored to the user's goals and skills
- Reference their career goals and interests when relevant
- Provide specific, data-driven insights when possible
- Current date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    }

    const response = await chat([systemMessage, ...messages])

    return NextResponse.json({ success: true, response })
  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}

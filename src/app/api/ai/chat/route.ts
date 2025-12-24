import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatContext {
  includeGoals?: boolean
  includeNotes?: boolean
}

// Initialize Groq client
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('GROQ_API_KEY not found in environment')
    return null
  }
  return new Groq({ apiKey })
}

export async function GET() {
  // Check if Groq is configured
  const hasGroq = !!process.env.GROQ_API_KEY
  return NextResponse.json({
    configured: hasGroq,
    provider: hasGroq ? 'groq' : null,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body = await request.json()
    const { messages, context } = body as {
      messages: AIMessage[]
      context?: ChatContext
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 })
    }

    // Get Groq client
    const groq = getGroqClient()
    if (!groq) {
      return NextResponse.json({
        error: 'AI not configured. GROQ_API_KEY is missing from environment variables.',
      }, { status: 503 })
    }

    // Build user context from their data
    let userContext = ''
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || 'User'

    // Optionally fetch goals
    if (context?.includeGoals) {
      try {
        const { data: goals } = await supabase
          .from('goals')
          .select('title, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(5)

        if (goals && goals.length > 0) {
          userContext += `\n\nActive goals:\n${goals.map((g: { title: string }) => `- ${g.title}`).join('\n')}`
        }
      } catch (e) {
        console.error('Failed to fetch goals:', e)
      }
    }

    // Optionally fetch notes
    if (context?.includeNotes) {
      try {
        const { data: notes } = await supabase
          .from('notes')
          .select('title')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5)

        if (notes && notes.length > 0) {
          userContext += `\n\nRecent notes:\n${notes.map((n: { title: string }) => `- ${n.title || 'Untitled'}`).join('\n')}`
        }
      } catch (e) {
        console.error('Failed to fetch notes:', e)
      }
    }

    // Create system message
    const systemMessage: AIMessage = {
      role: 'system',
      content: `You are BrainBox, the AI assistant for ${userName}'s personal productivity hub.

You help with:
- Career planning and tech industry insights
- Goal setting and productivity advice
- Technical questions about software engineering, AI/ML, and entrepreneurship
- Research and brainstorming
${userContext}

Be concise, practical, and helpful. Current date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
    }

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [systemMessage, ...messages].map(m => ({
        role: m.role,
        content: m.content,
      })),
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2048,
    })

    const responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      return NextResponse.json({
        error: 'No response generated from AI',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      response: responseContent,
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    })

  } catch (error) {
    console.error('AI Chat Error:', error)

    // Provide specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for common Groq errors
    if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
      return NextResponse.json({
        error: 'Invalid Groq API key. Please check your GROQ_API_KEY.',
      }, { status: 401 })
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait a moment and try again.',
      }, { status: 429 })
    }

    return NextResponse.json({
      error: `AI Error: ${errorMessage}`,
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

// Lazy-initialize Groq client to avoid build-time errors
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
}

export interface NoteInsights {
  summary: string
  keyTakeaways: string[]
  industryContext: {
    headline: string
    insight: string
    companies: string[]
    source: string
  }
  actionItems: string[]
  relatedTopics: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { noteId, title, content } = await request.json()

    if (!content || content.length < 20) {
      return NextResponse.json({
        error: 'Note content is too short for meaningful analysis',
      }, { status: 400 })
    }

    const prompt = `You are an AI assistant for a Computer Science student at BYU studying AI/ML and entrepreneurship. Analyze this note and provide insights relevant to the tech industry and career development.

NOTE TITLE: ${title || 'Untitled'}
NOTE CONTENT:
${content}

Provide a comprehensive analysis with:
1. A concise summary (2-3 sentences max)
2. 3-4 key takeaways from the note
3. ONE relevant industry insight connecting this topic to real developments in AI/tech companies. Include:
   - A compelling headline
   - A specific insight about how major tech companies (Google, Meta, OpenAI, Anthropic, Microsoft, Apple, Amazon, Nvidia, Tesla, etc.) are addressing similar topics
   - Name the specific companies involved
   - Reference a real development, product, or trend (be factual - use information from 2023-2024)
4. 2-3 actionable next steps based on this note
5. 3-4 related topics to explore further

Focus on AI, machine learning, software engineering, startups, and big tech industry relevance.

Respond in JSON format:
{
  "summary": "...",
  "keyTakeaways": ["...", "...", "..."],
  "industryContext": {
    "headline": "...",
    "insight": "...",
    "companies": ["...", "..."],
    "source": "Based on [real development/announcement]"
  },
  "actionItems": ["...", "..."],
  "relatedTopics": ["...", "...", "..."]
}`

    const completion = await getGroqClient().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('No response from AI')
    }

    const insights = JSON.parse(responseContent) as NoteInsights

    // Log usage for analytics (optional - could store in Supabase)
    console.log(`Note insights generated for user ${user.id}, note: ${noteId || 'new'}`)

    return NextResponse.json({
      success: true,
      insights,
    })
  } catch (error) {
    console.error('Note insights error:', error)

    // Return actual error - no fake data
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate AI insights. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

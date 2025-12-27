import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LangSearchResult {
  title: string
  url: string
  snippet: string
  summary?: string
  siteName?: string
}

interface LangSearchResponse {
  code: number
  msg: string
  data?: {
    webPages?: {
      value: LangSearchResult[]
    }
  }
}

interface ProcessedFact {
  keyPoints: string[]
  summary: string
  source: string
  url: string
  title: string
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query } = body as { query: string }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 })
    }

    const langSearchKey = process.env.LANGSEARCH_API_KEY
    const groqKey = process.env.GROQ_API_KEY

    if (!langSearchKey) {
      return NextResponse.json({
        error: 'Search not configured',
        facts: []
      }, { status: 503 })
    }

    // Search using LangSearch API
    const searchResponse = await fetch('https://api.langsearch.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${langSearchKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        freshness: 'noLimit',
        summary: true,
        count: 6,
      }),
    })

    if (!searchResponse.ok) {
      console.error('LangSearch API error:', searchResponse.status)
      return NextResponse.json({
        error: 'Search failed',
        facts: []
      }, { status: 500 })
    }

    const searchData: LangSearchResponse = await searchResponse.json()

    if (searchData.code !== 200 || !searchData.data?.webPages?.value) {
      return NextResponse.json({
        error: searchData.msg || 'No results found',
        facts: []
      })
    }

    const webResults = searchData.data.webPages.value

    // If no Groq key, return raw results (fallback)
    if (!groqKey) {
      const basicFacts: ProcessedFact[] = webResults.map(result => ({
        keyPoints: [result.summary || result.snippet],
        summary: result.summary || result.snippet,
        source: result.siteName || new URL(result.url).hostname,
        url: result.url,
        title: result.title,
      }))

      return NextResponse.json({
        success: true,
        facts: basicFacts,
        query,
        aiProcessed: false,
      })
    }

    // Use Groq AI to extract and format key facts from each source
    const processedFacts: ProcessedFact[] = []

    for (const result of webResults.slice(0, 5)) {
      const rawContent = result.summary || result.snippet
      if (!rawContent || rawContent.length < 30) continue

      try {
        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 500,
            messages: [
              {
                role: 'system',
                content: `You are a fact extraction assistant. Extract key facts from the provided text about "${query}".

Return a JSON object with this exact structure:
{
  "keyPoints": ["fact 1", "fact 2", "fact 3"],
  "summary": "A 1-2 sentence summary of the most important information"
}

Rules:
- Extract 2-4 specific, factual key points
- Each key point should be a complete, standalone fact (not a fragment)
- Focus on numbers, dates, statistics, definitions, or concrete information
- Summary should be concise and informative
- If the text doesn't contain useful facts, return minimal points
- Return ONLY valid JSON, no markdown or explanation`
              },
              {
                role: 'user',
                content: `Source: ${result.title}\n\nContent:\n${rawContent}`
              }
            ],
          }),
        })

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          const aiContent = aiData.choices?.[0]?.message?.content

          if (aiContent) {
            try {
              // Clean up potential markdown formatting
              const cleanJson = aiContent.replace(/```json\n?|\n?```/g, '').trim()
              const parsed = JSON.parse(cleanJson)

              if (parsed.keyPoints && Array.isArray(parsed.keyPoints)) {
                processedFacts.push({
                  keyPoints: parsed.keyPoints.slice(0, 4),
                  summary: parsed.summary || parsed.keyPoints[0],
                  source: result.siteName || new URL(result.url).hostname,
                  url: result.url,
                  title: result.title,
                })
              }
            } catch (parseError) {
              // If AI response isn't valid JSON, use raw content
              console.error('Failed to parse AI response:', parseError)
              processedFacts.push({
                keyPoints: [rawContent.slice(0, 200)],
                summary: rawContent.slice(0, 200),
                source: result.siteName || new URL(result.url).hostname,
                url: result.url,
                title: result.title,
              })
            }
          }
        }
      } catch (aiError) {
        console.error('AI processing error:', aiError)
        // Fallback to raw content
        processedFacts.push({
          keyPoints: [rawContent.slice(0, 200)],
          summary: rawContent.slice(0, 200),
          source: result.siteName || new URL(result.url).hostname,
          url: result.url,
          title: result.title,
        })
      }
    }

    console.log(`[FactSearch] Processed ${processedFacts.length} facts for: "${query}"`)

    return NextResponse.json({
      success: true,
      facts: processedFacts,
      query,
      aiProcessed: true,
    })

  } catch (error) {
    console.error('Fact search error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error',
      facts: []
    }, { status: 500 })
  }
}

export async function GET() {
  const hasLangSearch = !!process.env.LANGSEARCH_API_KEY
  const hasGroq = !!process.env.GROQ_API_KEY
  return NextResponse.json({
    configured: hasLangSearch,
    aiEnabled: hasGroq,
  })
}

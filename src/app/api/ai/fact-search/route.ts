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

interface Fact {
  text: string
  source: string
  url: string
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

    const apiKey = process.env.LANGSEARCH_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'Search not configured',
        facts: []
      }, { status: 503 })
    }

    // Search using LangSearch API
    const response = await fetch('https://api.langsearch.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        freshness: 'noLimit', // Get comprehensive results for facts
        summary: true, // Include detailed summaries
        count: 8, // Get more results for fact extraction
      }),
    })

    if (!response.ok) {
      console.error('LangSearch API error:', response.status)
      return NextResponse.json({
        error: 'Search failed',
        facts: []
      }, { status: 500 })
    }

    const data: LangSearchResponse = await response.json()

    if (data.code !== 200 || !data.data?.webPages?.value) {
      return NextResponse.json({
        error: data.msg || 'No results found',
        facts: []
      })
    }

    // Extract facts from search results
    const facts: Fact[] = data.data.webPages.value.map(result => ({
      text: result.summary || result.snippet,
      source: result.siteName || result.title,
      url: result.url,
    })).filter(fact => fact.text && fact.text.length > 20)

    console.log(`[FactSearch] Found ${facts.length} facts for: "${query}"`)

    return NextResponse.json({
      success: true,
      facts,
      query,
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
  return NextResponse.json({
    configured: hasLangSearch,
  })
}

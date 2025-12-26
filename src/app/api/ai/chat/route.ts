import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatContext {
  includeGoals?: boolean
  includeNotes?: boolean
  enableWebSearch?: boolean
}

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

// Check if query needs current information
function needsCurrentInfo(message: string): boolean {
  const currentInfoPatterns = [
    /\b(latest|current|recent|today|now|2024|2025)\b/i,
    /\b(news|update|happening|trending)\b/i,
    /\b(price|stock|weather|score)\b/i,
    /\b(who is|what is|where is|when is)\b/i,
    /\b(announce|release|launch|new)\b/i,
  ]
  return currentInfoPatterns.some(pattern => pattern.test(message))
}

// LangSearch Web Search API
// Docs: https://docs.langsearch.com/api/web-search-api
async function searchWeb(query: string): Promise<{
  results: LangSearchResult[]
  searchPerformed: boolean
  error?: string
}> {
  const apiKey = process.env.LANGSEARCH_API_KEY

  if (!apiKey) {
    return {
      results: [],
      searchPerformed: false,
      error: 'LANGSEARCH_API_KEY not configured'
    }
  }

  try {
    const response = await fetch('https://api.langsearch.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        freshness: 'oneMonth', // Get recent results
        summary: true, // Include detailed summaries for better AI context
        count: 5, // Top 5 results
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LangSearch API error:', response.status, errorText)
      return {
        results: [],
        searchPerformed: false,
        error: `Search API error: ${response.status}`
      }
    }

    const data: LangSearchResponse = await response.json()

    if (data.code !== 200 || !data.data?.webPages?.value) {
      console.error('LangSearch returned error:', data.msg)
      return {
        results: [],
        searchPerformed: false,
        error: data.msg || 'No results found'
      }
    }

    const results = data.data.webPages.value.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      summary: result.summary,
      siteName: result.siteName,
    }))

    console.log(`LangSearch found ${results.length} results for: "${query}"`)

    return {
      results,
      searchPerformed: true
    }
  } catch (error) {
    console.error('LangSearch error:', error)
    return {
      results: [],
      searchPerformed: false,
      error: error instanceof Error ? error.message : 'Search failed'
    }
  }
}

export async function GET() {
  const hasGroq = !!process.env.GROQ_API_KEY
  const hasLangSearch = !!process.env.LANGSEARCH_API_KEY

  return NextResponse.json({
    configured: hasGroq,
    provider: hasGroq ? 'groq' : null,
    webSearchEnabled: hasLangSearch,
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

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

    // Check Groq API key
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({
        error: 'GROQ_API_KEY not configured',
      }, { status: 503 })
    }

    // Build user context
    let userContext = ''
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || 'User'

    // Fetch recent conversation summaries for memory
    try {
      const { data: recentConversations } = await (supabase
        .from('conversations') as SupabaseAny)
        .select('title, messages')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3)

      if (recentConversations && recentConversations.length > 0) {
        const memoryContext = recentConversations
          .map((c: { title: string; messages: Array<{ role: string; content: string }> }) => {
            const lastMessages = c.messages?.slice(-2) || []
            const summary = lastMessages
              .map((m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 100)}...`)
              .join(' | ')
            return `"${c.title}": ${summary}`
          })
          .join('\n')
        userContext += `\n\nRecent conversation memory:\n${memoryContext}`
      }
    } catch (e) {
      console.error('Failed to fetch conversation memory:', e)
    }

    // Fetch active goals if requested
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

    // Fetch recent notes if requested
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

    // Check if user is asking about current/real-time information
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
    const askingAboutCurrent = needsCurrentInfo(lastUserMessage)

    // Determine if we should perform web search:
    // 1. If web search is explicitly enabled (toggle is on), always search
    // 2. If asking about current info and web search is not explicitly disabled
    const shouldSearch = context?.enableWebSearch === true ||
                         (askingAboutCurrent && context?.enableWebSearch !== false)

    // Perform web search
    let webSearchContext = ''
    let searchPerformed = false
    let searchError = ''

    if (shouldSearch) {
      console.log(`Web search triggered for: "${lastUserMessage.slice(0, 50)}..."`)
      const searchResult = await searchWeb(lastUserMessage)
      searchPerformed = searchResult.searchPerformed

      if (searchResult.results.length > 0) {
        webSearchContext = '\n\n=== LIVE WEB SEARCH RESULTS (Real-time data) ===\n'
        searchResult.results.forEach((result, i) => {
          webSearchContext += `\n[${i + 1}] ${result.title}`
          if (result.siteName) webSearchContext += ` (${result.siteName})`
          webSearchContext += `\nURL: ${result.url}\n`
          // Prefer summary if available, otherwise use snippet
          webSearchContext += result.summary || result.snippet
          webSearchContext += '\n'
        })
        webSearchContext += '\n=== END SEARCH RESULTS ===\n'
        webSearchContext += '\nIMPORTANT: Use the above real-time web search results to answer. This is current data, not from your training.\n'
      } else if (searchResult.error) {
        searchError = searchResult.error
        console.error(`Web search failed: ${searchError}`)
      }
    }

    // Build system message
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

    let knowledgeNote = ''
    if (searchPerformed && webSearchContext) {
      knowledgeNote = '\n\nCRITICAL: You have LIVE web search results above. You MUST use this real-time data to answer. Do NOT use outdated training data. Cite sources with URLs.'
    } else if (searchError) {
      knowledgeNote = `\n\nNote: Web search failed (${searchError}). Using training data which may be outdated.`
    } else if (askingAboutCurrent) {
      knowledgeNote = '\n\nNote: No web search was performed. My training data may not include the most recent information.'
    }

    const systemMessage: AIMessage = {
      role: 'system',
      content: `You are BrainBox, the AI assistant for ${userName}'s personal productivity hub.

Today's date is ${currentDate}. You have access to real-time web search.

You help with:
- Career planning and tech industry insights
- Goal setting and productivity advice
- Technical questions about software engineering, AI/ML, and entrepreneurship
- Research and brainstorming
${userContext}${webSearchContext}${knowledgeNote}

Be concise, practical, and helpful. When answering questions about current events, news, or real-time data, ALWAYS use the web search results provided above and cite your sources.`,
    }

    // Call Groq API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    let groqResponse: Response
    try {
      groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [systemMessage, ...messages].map(m => ({
            role: m.role,
            content: m.content,
          })),
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Groq fetch error:', fetchError)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timed out' }, { status: 504 })
      }
      return NextResponse.json({ error: 'Failed to connect to AI service' }, { status: 503 })
    }
    clearTimeout(timeoutId)

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq API error:', groqResponse.status, errorText)

      if (groqResponse.status === 401) {
        return NextResponse.json({ error: 'Invalid Groq API key' }, { status: 401 })
      }
      if (groqResponse.status === 429) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }

      return NextResponse.json({
        error: `AI service error (${groqResponse.status})`
      }, { status: 500 })
    }

    let data
    try {
      data = await groqResponse.json()
    } catch {
      return NextResponse.json({ error: 'Invalid response from AI' }, { status: 500 })
    }

    const responseContent = data.choices?.[0]?.message?.content

    if (!responseContent) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    const duration = Date.now() - startTime
    console.log(`AI Chat completed in ${duration}ms (web search: ${searchPerformed})`)

    return NextResponse.json({
      success: true,
      response: responseContent,
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      webSearchUsed: searchPerformed,
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error',
    }, { status: 500 })
  }
}

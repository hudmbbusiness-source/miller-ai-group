// LangSearch Web Search Integration
// Shared utility for all AI endpoints to access real-time web data

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  summary?: string
  siteName?: string
}

export interface WebSearchResponse {
  results: WebSearchResult[]
  searchPerformed: boolean
  error?: string
  query: string
}

interface LangSearchAPIResponse {
  code: number
  msg: string
  data?: {
    webPages?: {
      value: WebSearchResult[]
    }
  }
}

// Perform web search using LangSearch API
export async function searchWeb(
  query: string,
  options: {
    count?: number
    freshness?: 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear'
    includeSummary?: boolean
  } = {}
): Promise<WebSearchResponse> {
  const apiKey = process.env.LANGSEARCH_API_KEY

  if (!apiKey) {
    return {
      results: [],
      searchPerformed: false,
      error: 'LANGSEARCH_API_KEY not configured',
      query,
    }
  }

  const { count = 5, freshness = 'oneMonth', includeSummary = true } = options

  try {
    const response = await fetch('https://api.langsearch.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        freshness,
        summary: includeSummary,
        count,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LangSearch API error:', response.status, errorText)
      return {
        results: [],
        searchPerformed: false,
        error: `Search API error: ${response.status}`,
        query,
      }
    }

    const data: LangSearchAPIResponse = await response.json()

    if (data.code !== 200 || !data.data?.webPages?.value) {
      console.error('LangSearch returned error:', data.msg)
      return {
        results: [],
        searchPerformed: false,
        error: data.msg || 'No results found',
        query,
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
      searchPerformed: true,
      query,
    }
  } catch (error) {
    console.error('LangSearch error:', error)
    return {
      results: [],
      searchPerformed: false,
      error: error instanceof Error ? error.message : 'Search failed',
      query,
    }
  }
}

// Format search results for AI context injection
export function formatSearchResultsForAI(searchResponse: WebSearchResponse): string {
  if (!searchResponse.searchPerformed || searchResponse.results.length === 0) {
    return ''
  }

  let context = '\n\n=== LIVE WEB SEARCH RESULTS ===\n'
  context += `Search query: "${searchResponse.query}"\n`

  searchResponse.results.forEach((result, i) => {
    context += `\n[${i + 1}] ${result.title}`
    if (result.siteName) context += ` (${result.siteName})`
    context += `\nURL: ${result.url}\n`
    // Prefer summary if available, otherwise use snippet
    const content = result.summary || result.snippet
    // Limit content length to avoid overwhelming the context
    context += content.slice(0, 1000)
    if (content.length > 1000) context += '...'
    context += '\n'
  })

  context += '\n=== END SEARCH RESULTS ===\n'
  return context
}

// Search for specific topics with pre-configured queries
export async function searchTechJobs(): Promise<WebSearchResponse> {
  return searchWeb('tech job market trends 2025 hiring software engineer AI ML salaries', {
    freshness: 'oneWeek',
    count: 5,
  })
}

export async function searchAIIndustry(): Promise<WebSearchResponse> {
  return searchWeb('AI industry news 2025 OpenAI Anthropic Google DeepMind hiring trends', {
    freshness: 'oneWeek',
    count: 5,
  })
}

export async function searchInternships(): Promise<WebSearchResponse> {
  return searchWeb('top tech internships 2025 software engineering AI ML summer internship applications', {
    freshness: 'oneMonth',
    count: 5,
  })
}

export async function searchSalaryData(): Promise<WebSearchResponse> {
  return searchWeb('tech salaries 2025 software engineer ML engineer levels.fyi compensation', {
    freshness: 'oneMonth',
    count: 5,
  })
}

export async function searchCompanyHiring(company: string): Promise<WebSearchResponse> {
  return searchWeb(`${company} hiring 2025 jobs careers internships`, {
    freshness: 'oneMonth',
    count: 3,
  })
}

// Check if web search is available
export function isWebSearchAvailable(): boolean {
  return !!process.env.LANGSEARCH_API_KEY
}

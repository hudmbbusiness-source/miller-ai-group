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

interface Product {
  name: string
  description: string
  url: string
  source: string
  image_url: string | null
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
        products: []
      }, { status: 503 })
    }

    // Search for products - add "buy" or "product" to improve results
    const searchQuery = `${query} product buy`

    const response = await fetch('https://api.langsearch.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        freshness: 'noLimit',
        summary: true,
        count: 10,
      }),
    })

    if (!response.ok) {
      console.error('LangSearch API error:', response.status)
      return NextResponse.json({
        error: 'Search failed',
        products: []
      }, { status: 500 })
    }

    const data: LangSearchResponse = await response.json()

    if (data.code !== 200 || !data.data?.webPages?.value) {
      return NextResponse.json({
        error: data.msg || 'No results found',
        products: []
      })
    }

    // Extract product info from search results
    const products: Product[] = data.data.webPages.value
      .filter(result => {
        // Filter to likely product pages
        const url = result.url.toLowerCase()
        const title = result.title.toLowerCase()
        return url.includes('product') ||
               url.includes('item') ||
               url.includes('shop') ||
               url.includes('buy') ||
               url.includes('amazon') ||
               url.includes('ebay') ||
               url.includes('walmart') ||
               url.includes('target') ||
               url.includes('bestbuy') ||
               title.includes('buy') ||
               title.includes('shop') ||
               result.siteName?.toLowerCase().includes('amazon') ||
               result.siteName?.toLowerCase().includes('shop')
      })
      .slice(0, 8)
      .map(result => ({
        name: result.title.split(' - ')[0].split(' | ')[0].trim(), // Clean up title
        description: result.summary || result.snippet,
        url: result.url,
        source: result.siteName || new URL(result.url).hostname.replace('www.', ''),
        image_url: null, // Would need a separate image search or scraping
      }))

    // If no products found with filters, return top results anyway
    if (products.length === 0) {
      const fallbackProducts: Product[] = data.data.webPages.value.slice(0, 6).map(result => ({
        name: result.title.split(' - ')[0].split(' | ')[0].trim(),
        description: result.summary || result.snippet,
        url: result.url,
        source: result.siteName || new URL(result.url).hostname.replace('www.', ''),
        image_url: null,
      }))

      console.log(`[ProductSearch] Found ${fallbackProducts.length} fallback results for: "${query}"`)
      return NextResponse.json({
        success: true,
        products: fallbackProducts,
        query,
      })
    }

    console.log(`[ProductSearch] Found ${products.length} products for: "${query}"`)

    return NextResponse.json({
      success: true,
      products,
      query,
    })

  } catch (error) {
    console.error('Product search error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error',
      products: []
    }, { status: 500 })
  }
}

export async function GET() {
  const hasLangSearch = !!process.env.LANGSEARCH_API_KEY
  return NextResponse.json({
    configured: hasLangSearch,
  })
}

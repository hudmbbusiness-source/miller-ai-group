import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Fetch metadata from a URL (title, description, favicon)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Fetch the page with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KachowBot/1.0; +https://kachow.app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      })

      clearTimeout(timeout)

      if (!response.ok) {
        // Return basic info from URL if fetch fails
        return NextResponse.json({
          success: true,
          metadata: {
            title: parsedUrl.hostname,
            description: null,
            favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
            siteName: parsedUrl.hostname,
          }
        })
      }

      const html = await response.text()

      // Parse metadata from HTML
      const metadata = parseMetadata(html, parsedUrl)

      return NextResponse.json({
        success: true,
        metadata,
      })
    } catch (fetchError) {
      clearTimeout(timeout)
      // Return basic info from URL if fetch fails
      return NextResponse.json({
        success: true,
        metadata: {
          title: parsedUrl.hostname,
          description: null,
          favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
          siteName: parsedUrl.hostname,
        }
      })
    }
  } catch (error) {
    console.error('Metadata fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    )
  }
}

function parseMetadata(html: string, url: URL): {
  title: string | null
  description: string | null
  favicon: string | null
  siteName: string | null
  image: string | null
} {
  // Extract title - check meta tags first, then <title>
  const title = extractMetaContent(html, 'og:title') ||
              extractMetaContent(html, 'twitter:title') ||
              extractTitle(html)

  // Extract description
  const description = extractMetaContent(html, 'og:description') ||
                      extractMetaContent(html, 'twitter:description') ||
                      extractMetaContent(html, 'description')

  // Extract site name
  const siteName = extractMetaContent(html, 'og:site_name') ||
                   url.hostname.replace('www.', '')

  // Extract favicon
  let favicon = extractFavicon(html, url)
  if (!favicon) {
    // Fallback to Google's favicon service
    favicon = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`
  }

  // Extract image (og:image)
  let image = extractMetaContent(html, 'og:image') ||
              extractMetaContent(html, 'twitter:image')

  // Make image URL absolute if relative
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, url.origin).toString()
    } catch {
      image = null
    }
  }

  return {
    title: title ? decodeHTMLEntities(title.trim()) : url.hostname,
    description: description ? decodeHTMLEntities(description.trim()) : null,
    favicon,
    siteName: siteName ? decodeHTMLEntities(siteName) : null,
    image,
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // Try property attribute (for og: tags)
  const propertyRegex = new RegExp(
    `<meta[^>]*property=["']${escapeRegExp(property)}["'][^>]*content=["']([^"']+)["']`,
    'i'
  )
  let match = html.match(propertyRegex)
  if (match) return match[1]

  // Try content before property
  const propertyRegex2 = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${escapeRegExp(property)}["']`,
    'i'
  )
  match = html.match(propertyRegex2)
  if (match) return match[1]

  // Try name attribute (for twitter: and description tags)
  const nameRegex = new RegExp(
    `<meta[^>]*name=["']${escapeRegExp(property)}["'][^>]*content=["']([^"']+)["']`,
    'i'
  )
  match = html.match(nameRegex)
  if (match) return match[1]

  // Try content before name
  const nameRegex2 = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${escapeRegExp(property)}["']`,
    'i'
  )
  match = html.match(nameRegex2)
  if (match) return match[1]

  return null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1] : null
}

function extractFavicon(html: string, url: URL): string | null {
  // Look for various favicon link tags
  const patterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      let faviconUrl = match[1]
      // Make absolute if relative
      if (!faviconUrl.startsWith('http')) {
        try {
          faviconUrl = new URL(faviconUrl, url.origin).toString()
        } catch {
          continue
        }
      }
      return faviconUrl
    }
  }

  return null
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char)
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  return result
}

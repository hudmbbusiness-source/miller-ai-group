import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Allowed domains for image proxying (security: prevent SSRF)
const ALLOWED_DOMAINS = [
  'avatars.githubusercontent.com',
  'github.com',
  'raw.githubusercontent.com',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'pbs.twimg.com',
  'cdn.discordapp.com',
  'media.licdn.com',
]

export async function GET(request: NextRequest) {
  // Require authentication
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 })
  }

  // Validate URL and check against allowed domains
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  // Security: Only allow HTTPS
  if (parsedUrl.protocol !== 'https:') {
    return new NextResponse('Only HTTPS URLs are allowed', { status: 400 })
  }

  // Security: Check against allowed domains
  const isAllowed = ALLOWED_DOMAINS.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain))
  if (!isAllowed) {
    return new NextResponse('Domain not allowed', { status: 403 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Miller-AI-Group/1.0)',
        'Accept': 'image/*',
      },
    })

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Failed to fetch image', { status: 500 })
  }
}

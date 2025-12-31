import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { previewFix, isPathSafe } from '@/lib/diagnostics/fix-engine'
import type { ProposedFix } from '@/lib/diagnostics/types'

// POST - Preview a fix before applying
export async function POST(request: NextRequest) {
  try {
    const owner = await isOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fix } = body as { fix: ProposedFix }

    if (!fix) {
      return NextResponse.json({ error: 'No fix provided' }, { status: 400 })
    }

    // Validate path first
    const pathCheck = isPathSafe(fix.filePath)
    if (!pathCheck.safe) {
      return NextResponse.json({
        success: false,
        error: pathCheck.reason,
        securityBlocked: true
      }, { status: 400 })
    }

    const result = await previewFix(fix)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Fix preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview fix' },
      { status: 500 }
    )
  }
}

// GET - Check if a path is safe to modify
export async function GET(request: NextRequest) {
  try {
    const owner = await isOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }

    const result = isPathSafe(path)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Path check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check path' },
      { status: 500 }
    )
  }
}

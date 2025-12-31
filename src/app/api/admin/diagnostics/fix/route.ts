import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { applyFix, rollbackFix, applyMultipleFixes } from '@/lib/diagnostics/fix-engine'
import type { ProposedFix } from '@/lib/diagnostics/types'

// POST - Apply a fix
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
    const { fixes, diagnosticLogId } = body as {
      fixes: ProposedFix[] | ProposedFix
      diagnosticLogId?: string
    }

    if (!fixes) {
      return NextResponse.json({ error: 'No fixes provided' }, { status: 400 })
    }

    // Handle single fix or multiple fixes
    if (Array.isArray(fixes)) {
      const result = await applyMultipleFixes(fixes, user.id, diagnosticLogId)
      return NextResponse.json(result)
    } else {
      const result = await applyFix(fixes, user.id, diagnosticLogId)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Fix application error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply fix' },
      { status: 500 }
    )
  }
}

// DELETE - Rollback a fix
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const diagnosticLogId = searchParams.get('id')

    if (!diagnosticLogId) {
      return NextResponse.json({ error: 'Diagnostic log ID required' }, { status: 400 })
    }

    const result = await rollbackFix(diagnosticLogId, user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Fix rollback error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rollback fix' },
      { status: 500 }
    )
  }
}

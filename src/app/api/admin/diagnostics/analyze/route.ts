// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { analyzeIssue, quickIssueCheck } from '@/lib/diagnostics/issue-analyzer'
import type { IssueReportRequest } from '@/lib/diagnostics/types'

// POST - Analyze an issue
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
    const { description, location, expectedBehavior, actualBehavior, stepsToReproduce } = body

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed description (at least 10 characters)' },
        { status: 400 }
      )
    }

    const issueRequest: IssueReportRequest = {
      description: description.trim(),
      location: location?.trim(),
      expectedBehavior: expectedBehavior?.trim(),
      actualBehavior: actualBehavior?.trim(),
      stepsToReproduce: stepsToReproduce?.trim(),
    }

    const startTime = Date.now()

    // Get quick checks first
    const quickIssues = quickIssueCheck(description)

    // Run full AI analysis
    const analysisResult = await analyzeIssue(issueRequest)

    // Merge quick issues with AI-found issues (deduplicate by category)
    const existingCategories = new Set(analysisResult.issues.map(i => i.category))
    const uniqueQuickIssues = quickIssues.filter(qi => !existingCategories.has(qi.category))
    analysisResult.issues = [...analysisResult.issues, ...uniqueQuickIssues]

    const duration_ms = Date.now() - startTime

    // Log the diagnostic session
    try {
      await (supabase.from('diagnostic_logs') as ReturnType<typeof supabase.from>).insert({
        user_id: user.id,
        type: 'issue_analysis',
        request_description: issueRequest.description,
        request_context: {
          location: issueRequest.location,
          expectedBehavior: issueRequest.expectedBehavior,
          actualBehavior: issueRequest.actualBehavior,
          stepsToReproduce: issueRequest.stepsToReproduce,
        },
        analysis_result: analysisResult,
        issues_found: analysisResult.issues,
        suggestions: analysisResult.suggestions,
        proposed_fix: analysisResult.proposedFixes.length > 0 ? { fixes: analysisResult.proposedFixes } : null,
        ai_provider: analysisResult.aiProvider,
        ai_model: analysisResult.aiModel,
        duration_ms,
      } as Record<string, unknown>)
    } catch (saveError) {
      console.error('Failed to save diagnostic log:', saveError)
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      duration_ms,
    })
  } catch (error) {
    console.error('Issue analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

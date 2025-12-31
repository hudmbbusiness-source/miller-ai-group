import type {
  AnalysisResult,
  IssueReportRequest,
  DiagnosticIssue,
  ProposedFix,
} from './types'
import { runQuickHealthCheck } from './health-checker'

// AI prompt for issue analysis
function buildIssueAnalysisPrompt(
  request: IssueReportRequest,
  systemContext: string
): string {
  return `You are a diagnostic AI for a Next.js 14 application called Miller AI Group Hub. Analyze the following issue and provide structured recommendations.

## System Context
- Framework: Next.js 14 with App Router
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- AI Providers: Groq, Cerebras, Gemini, LangSearch
- Styling: Tailwind CSS, shadcn/ui
- Deployment: Vercel

## Current System State
${systemContext}

## User Reported Issue
**Description:** ${request.description}
${request.location ? `**Location:** ${request.location}` : ''}
${request.expectedBehavior ? `**Expected Behavior:** ${request.expectedBehavior}` : ''}
${request.actualBehavior ? `**Actual Behavior:** ${request.actualBehavior}` : ''}
${request.stepsToReproduce ? `**Steps to Reproduce:** ${request.stepsToReproduce}` : ''}

## Instructions
1. Analyze the issue based on the system state and description
2. Identify potential root causes with confidence levels
3. Propose concrete fixes with code/config changes
4. Rate each fix by risk level (low/medium/high)

## Response Format (JSON only, no markdown)
{
  "summary": "Brief issue summary in one sentence",
  "issues": [
    {
      "id": "issue_1",
      "severity": "critical|high|medium|low",
      "category": "code|config|database|api|security|performance",
      "title": "Short issue title",
      "description": "Detailed description of what's wrong",
      "location": "file path or component name if known",
      "suggestion": "How to fix this issue"
    }
  ],
  "suggestions": ["General recommendation 1", "General recommendation 2"],
  "proposedFixes": [
    {
      "id": "fix_1",
      "type": "code|env|database|config",
      "description": "What this fix does",
      "risk": "low|medium|high",
      "confidence": 0.85,
      "estimatedImpact": "What will improve after applying this fix",
      "changes": [
        {
          "file": "path/to/file.ts",
          "action": "modify|create|delete",
          "description": "What changes to make",
          "content": "The new code/content to use (if applicable)"
        }
      ]
    }
  ],
  "confidence": 0.8
}`
}

// Call AI for analysis
async function callAIForAnalysis(prompt: string): Promise<{
  success: boolean
  content?: string
  provider?: string
  model?: string
  error?: string
}> {
  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a diagnostic AI assistant. Respond only with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          return { success: true, content, provider: 'groq', model: 'llama-3.3-70b-versatile' }
        }
      }
    } catch (error) {
      console.error('Groq analysis error:', error)
    }
  }

  // Try Cerebras
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b',
          messages: [
            { role: 'system', content: 'You are a diagnostic AI assistant. Respond only with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          return { success: true, content, provider: 'cerebras', model: 'llama-3.3-70b' }
        }
      }
    } catch (error) {
      console.error('Cerebras analysis error:', error)
    }
  }

  return { success: false, error: 'No AI providers available' }
}

// Parse AI response into structured format
function parseAIResponse(content: string): Partial<AnalysisResult> {
  try {
    // Clean up the response - remove markdown code blocks if present
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7)
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3)
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3)
    }
    cleanContent = cleanContent.trim()

    const parsed = JSON.parse(cleanContent)

    return {
      summary: parsed.summary || 'Analysis completed',
      issues: (parsed.issues || []).map((issue: DiagnosticIssue, index: number) => ({
        ...issue,
        id: issue.id || `issue_${index + 1}`,
      })),
      suggestions: parsed.suggestions || [],
      proposedFixes: (parsed.proposedFixes || []).map((fix: ProposedFix, index: number) => ({
        ...fix,
        id: fix.id || `fix_${index + 1}`,
      })),
      confidence: parsed.confidence || 0.5,
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    return {
      summary: 'Analysis completed with parsing errors',
      issues: [],
      suggestions: ['The AI response could not be fully parsed. Please try again.'],
      proposedFixes: [],
      confidence: 0.3,
    }
  }
}

// Main analysis function
export async function analyzeIssue(request: IssueReportRequest): Promise<AnalysisResult> {
  // Get current system state for context
  const healthCheck = await runQuickHealthCheck()
  const systemContext = `System Status: ${healthCheck.status} - ${healthCheck.message}`

  // Build the prompt
  const prompt = buildIssueAnalysisPrompt(request, systemContext)

  // Call AI
  const aiResult = await callAIForAnalysis(prompt)

  if (!aiResult.success || !aiResult.content) {
    return {
      summary: 'Analysis failed - no AI providers available',
      issues: [],
      suggestions: [
        'Configure at least one AI provider (GROQ_API_KEY or CEREBRAS_API_KEY) to enable issue analysis.',
      ],
      proposedFixes: [],
      confidence: 0,
    }
  }

  // Parse the response
  const parsed = parseAIResponse(aiResult.content)

  return {
    summary: parsed.summary || 'Analysis completed',
    issues: parsed.issues || [],
    suggestions: parsed.suggestions || [],
    proposedFixes: parsed.proposedFixes || [],
    confidence: parsed.confidence || 0.5,
    aiProvider: aiResult.provider,
    aiModel: aiResult.model,
  }
}

// Quick issue check (for common problems)
export function quickIssueCheck(description: string): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = []
  const lowerDesc = description.toLowerCase()

  // Common patterns
  if (lowerDesc.includes('api') && (lowerDesc.includes('error') || lowerDesc.includes('fail'))) {
    issues.push({
      id: 'quick_api_error',
      severity: 'high',
      category: 'api',
      title: 'Possible API Error',
      description: 'The issue appears to be related to an API error.',
      suggestion: 'Check API keys are configured correctly and the service is available.',
    })
  }

  if (lowerDesc.includes('database') || lowerDesc.includes('supabase')) {
    issues.push({
      id: 'quick_db_issue',
      severity: 'high',
      category: 'database',
      title: 'Database Related Issue',
      description: 'The issue appears to be related to database operations.',
      suggestion: 'Verify Supabase connection and check if RLS policies are configured correctly.',
    })
  }

  if (lowerDesc.includes('auth') || lowerDesc.includes('login') || lowerDesc.includes('sign')) {
    issues.push({
      id: 'quick_auth_issue',
      severity: 'high',
      category: 'security',
      title: 'Authentication Issue',
      description: 'The issue appears to be related to authentication.',
      suggestion: 'Check OAuth configuration and Supabase auth settings.',
    })
  }

  if (lowerDesc.includes('slow') || lowerDesc.includes('performance') || lowerDesc.includes('loading')) {
    issues.push({
      id: 'quick_perf_issue',
      severity: 'medium',
      category: 'performance',
      title: 'Performance Issue',
      description: 'The issue appears to be performance related.',
      suggestion: 'Check for unnecessary re-renders, optimize database queries, and review API response times.',
    })
  }

  if (lowerDesc.includes('style') || lowerDesc.includes('css') || lowerDesc.includes('ui')) {
    issues.push({
      id: 'quick_style_issue',
      severity: 'low',
      category: 'code',
      title: 'Styling Issue',
      description: 'The issue appears to be related to styling or UI.',
      suggestion: 'Check Tailwind classes and component styles for conflicts.',
    })
  }

  return issues
}

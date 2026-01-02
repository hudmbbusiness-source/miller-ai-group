// Test the AI Issue Reporter with a real bug
require('dotenv').config({ path: '.env.local' })

async function testIssueReporter() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║         AI ISSUE REPORTER TEST                         ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  // Real bug description
  const issueRequest = {
    description: 'The StuntMan crypto trading bot shows connection errors when trying to fetch account balance from Crypto.com exchange. The API calls fail intermittently and sometimes show stale data.',
    location: 'src/app/(hub)/app/stuntman',
    expectedBehavior: 'Should display real-time account balance and allow trading',
    actualBehavior: 'Shows connection errors or outdated balance information',
    stepsToReproduce: '1. Go to StuntMan page 2. Wait for balance to load 3. See error or stale data'
  }

  console.log('Submitting issue for analysis...')
  console.log('Description:', issueRequest.description.substring(0, 80) + '...\n')

  const GROQ_KEY = process.env.GROQ_API_KEY
  const systemContext = 'System Status: healthy - All APIs operational'

  const prompt = `You are a diagnostic AI for a Next.js 14 application called Miller AI Group Hub. Analyze the following issue and provide structured recommendations.

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
**Description:** ${issueRequest.description}
**Location:** ${issueRequest.location}
**Expected Behavior:** ${issueRequest.expectedBehavior}
**Actual Behavior:** ${issueRequest.actualBehavior}
**Steps to Reproduce:** ${issueRequest.stepsToReproduce}

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
      "estimatedImpact": "What will improve after applying this fix"
    }
  ],
  "confidence": 0.8
}`

  const startTime = Date.now()

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_KEY,
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

    const duration = Date.now() - startTime

    if (response.ok) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      // Clean and parse JSON
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7)
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3)
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3)
      cleanContent = cleanContent.trim()

      const result = JSON.parse(cleanContent)

      console.log('═'.repeat(60))
      console.log('ANALYSIS RESULTS')
      console.log('═'.repeat(60))
      console.log('\nSummary:', result.summary)
      console.log('Confidence:', (result.confidence * 100).toFixed(0) + '%')
      console.log('Duration:', duration + 'ms')
      console.log('AI Model: Groq llama-3.3-70b-versatile')

      console.log('\n─── ISSUES FOUND (' + result.issues.length + ') ───')
      for (const issue of result.issues) {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🟢'
        console.log('\n' + icon + ' [' + issue.severity.toUpperCase() + '] ' + issue.title)
        console.log('   Category: ' + issue.category)
        console.log('   ' + issue.description)
        if (issue.location) console.log('   Location: ' + issue.location)
        console.log('   Fix: ' + issue.suggestion)
      }

      console.log('\n─── SUGGESTED FIXES (' + result.proposedFixes.length + ') ───')
      for (const fix of result.proposedFixes) {
        const riskIcon = fix.risk === 'high' ? '⚠️' : fix.risk === 'medium' ? '⚡' : '✅'
        console.log('\n' + riskIcon + ' ' + fix.description)
        console.log('   Type: ' + fix.type + ' | Risk: ' + fix.risk + ' | Confidence: ' + ((fix.confidence || 0.5) * 100).toFixed(0) + '%')
        if (fix.estimatedImpact) console.log('   Impact: ' + fix.estimatedImpact)
      }

      console.log('\n─── GENERAL SUGGESTIONS ───')
      for (const suggestion of result.suggestions) {
        console.log('  • ' + suggestion)
      }

      console.log('\n' + '═'.repeat(60))
      console.log('✓ Analysis complete!')
      console.log('═'.repeat(60))

    } else {
      const err = await response.text()
      console.log('API Error:', err.substring(0, 200))
    }
  } catch (e) {
    console.log('Error:', e.message)
  }
}

testIssueReporter().catch(console.error)

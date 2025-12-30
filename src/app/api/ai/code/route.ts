import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

let groqClient: Groq | null = null

function getGroqClient(): Groq {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured')
    }
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groqClient
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

const PLAYGROUND_SYSTEM_PROMPT = `You are an expert creative web developer who builds impressive, interactive web experiences. You create visually stunning code with animations, effects, and interactivity.

CRITICAL: You MUST respond with valid JSON in this exact format:
{
  "description": "Brief description of what you created",
  "html": "your HTML code here",
  "css": "your CSS code here",
  "js": "your JavaScript code here"
}

IMPORTANT RULES:
1. Response must be ONLY valid JSON - no markdown, no extra text
2. All code must be COMPLETE and WORKING - no placeholders, no "// add more here"
3. HTML should be just body content (no doctype, html, head, body tags)
4. Escape all quotes and special characters properly for JSON

STYLE REQUIREMENTS - Make everything visually impressive:
- Use modern CSS: gradients, shadows, blur, transforms, transitions
- Add smooth animations with CSS @keyframes or JS requestAnimationFrame
- Use vibrant color schemes with proper contrast
- Add hover effects, glows, particle effects when appropriate
- For games: use HTML5 Canvas with smooth 60fps animations
- For UI: glassmorphism, neumorphism, modern card designs
- Make it responsive and centered on the page

EXAMPLES OF WHAT TO CREATE:
- "bouncing ball" = Animated ball with physics, trails, color changes, click interactions
- "button" = Glowing neon button with hover effects, ripple animation, gradient
- "clock" = Analog or digital clock with smooth animations, modern design
- "game" = Full canvas game with controls, scoring, particles, sound effects
- "loading" = Creative loading animation with multiple elements

Always go above and beyond what's asked - add extra polish and effects.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, language, existingCode, action, systemPrompt, conversationHistory, currentCode } = body

    if (!prompt && !existingCode) {
      return NextResponse.json({ error: 'Prompt or existing code is required' }, { status: 400 })
    }

    // Playground chat mode - JSON response
    if (action === 'playground') {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: PLAYGROUND_SYSTEM_PROMPT }
      ]

      // Build context-aware prompt
      let userPrompt = prompt

      // If there's existing code, include it for modifications
      if (currentCode && (currentCode.html || currentCode.css || currentCode.js)) {
        userPrompt = `CURRENT CODE TO MODIFY:
HTML: ${currentCode.html || '(empty)'}
CSS: ${currentCode.css || '(empty)'}
JS: ${currentCode.js || '(empty)'}

USER REQUEST: ${prompt}

Modify the existing code based on the request. Keep what works, improve what's asked.`
      }

      messages.push({ role: 'user', content: userPrompt })

      const completion = await getGroqClient().chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 8000,
      })

      const result = completion.choices[0]?.message?.content || ''

      // Parse JSON response
      try {
        // Try to extract JSON from the response
        let jsonStr = result.trim()

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }

        // Find JSON object in response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
        }

        const parsed = JSON.parse(jsonStr)

        return NextResponse.json({
          success: true,
          description: parsed.description || 'Code generated',
          html: parsed.html || '',
          css: parsed.css || '',
          js: parsed.js || '',
          tokensUsed: completion.usage?.total_tokens || 0,
        })
      } catch (parseError) {
        // If JSON parsing fails, try to extract code another way
        console.error('JSON parse failed, trying fallback:', parseError)

        // Return raw response for debugging
        return NextResponse.json({
          success: false,
          error: 'Failed to parse AI response',
          raw: result,
          tokensUsed: completion.usage?.total_tokens || 0,
        })
      }
    }

    // Legacy chat mode - for backward compatibility
    if (action === 'chat' && systemPrompt) {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt }
      ]

      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory as ConversationMessage[]) {
          messages.push({ role: msg.role, content: msg.content })
        }
      }

      messages.push({ role: 'user', content: prompt })

      const completion = await getGroqClient().chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 8000,
      })

      const result = completion.choices[0]?.message?.content || ''

      return NextResponse.json({
        code: result,
        response: result,
        action: 'chat',
        tokensUsed: completion.usage?.total_tokens || 0,
      })
    }

    // Legacy single-action modes
    let defaultSystemPrompt = `You are an expert programmer. You write clean, efficient, well-documented code.
Always respond with ONLY the code - no explanations, no markdown code blocks, just the raw code.
Use modern best practices and include helpful comments where appropriate.`

    let userPrompt = ''

    if (action === 'generate') {
      userPrompt = `Write ${language || 'JavaScript'} code for the following:

${prompt}

Remember: Return ONLY the code, no markdown, no explanations.`
    } else if (action === 'improve') {
      userPrompt = `Improve this ${language || 'JavaScript'} code. Make it more efficient, readable, and add helpful comments:

${existingCode}

${prompt ? `Additional instructions: ${prompt}` : ''}

Remember: Return ONLY the improved code, no markdown, no explanations.`
    } else if (action === 'explain') {
      defaultSystemPrompt = `You are an expert programmer who explains code clearly and concisely.`
      userPrompt = `Explain this ${language || 'JavaScript'} code in detail:

${existingCode}

Explain what it does, how it works, and any important patterns or concepts used.`
    } else if (action === 'debug') {
      userPrompt = `Debug and fix this ${language || 'JavaScript'} code:

${existingCode}

${prompt ? `The issue is: ${prompt}` : 'Find and fix any bugs or issues.'}

Remember: Return ONLY the fixed code, no markdown, no explanations.`
    } else if (action === 'convert') {
      userPrompt = `Convert this code to ${prompt || 'TypeScript'}:

${existingCode}

Remember: Return ONLY the converted code, no markdown, no explanations.`
    }

    const completion = await getGroqClient().chat.completions.create({
      messages: [
        { role: 'system', content: defaultSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4096,
    })

    const result = completion.choices[0]?.message?.content || ''

    // Clean up any markdown code blocks if present
    let cleanedResult = result
    if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
    }

    return NextResponse.json({
      code: cleanedResult,
      action,
      language,
      tokensUsed: completion.usage?.total_tokens || 0,
    })
  } catch (error) {
    console.error('Code generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate code. Please try again.' },
      { status: 500 }
    )
  }
}

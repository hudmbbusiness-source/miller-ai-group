import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import Cerebras from '@cerebras/cerebras_cloud_sdk'

let groqClient: Groq | null = null
let cerebrasClient: Cerebras | null = null

function getGroqClient(): Groq | null {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groqClient
}

function getCerebrasClient(): Cerebras | null {
  if (!cerebrasClient && process.env.CEREBRAS_API_KEY) {
    cerebrasClient = new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY,
    })
  }
  return cerebrasClient
}

// Return type for AI completion
interface CompletionResult {
  content: string
  tokensUsed: number
  model: string
  provider: string
}

// Try providers with retry logic - Cerebras first (70B model, 1M tokens/day free)
async function callWithRetry(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { temperature: number; max_tokens: number }
): Promise<CompletionResult> {
  const maxRetries = 2
  const baseDelay = 3000

  // Try Cerebras first - better model (70B) with generous limits
  const cerebras = getCerebrasClient()
  if (cerebras) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const completion = await cerebras.chat.completions.create({
          messages,
          model: 'llama-3.3-70b',
          temperature: options.temperature,
          max_tokens: options.max_tokens,
        }) as { choices: { message: { content: string } }[]; usage?: { totalTokens?: number } }
        return {
          content: completion.choices[0]?.message?.content || '',
          tokensUsed: completion.usage?.totalTokens || 0,
          model: 'llama-3.3-70b',
          provider: 'cerebras'
        }
      } catch (error) {
        const isRateLimit = error instanceof Error &&
          (error.message.includes('rate') || error.message.includes('429') || error.message.includes('limit'))

        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else if (isRateLimit) {
          break // Try Groq
        } else {
          throw error
        }
      }
    }
  }

  // Fallback to Groq
  const groq = getGroqClient()
  if (groq) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          messages,
          model: 'llama-3.3-70b-versatile',
          temperature: options.temperature,
          max_tokens: options.max_tokens,
        })
        return {
          content: completion.choices[0]?.message?.content || '',
          tokensUsed: completion.usage?.total_tokens || 0,
          model: 'llama-3.3-70b-versatile',
          provider: 'groq'
        }
      } catch (error) {
        const isRateLimit = error instanceof Error &&
          (error.message.includes('rate') || error.message.includes('429') || error.message.includes('limit'))

        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else if (!isRateLimit) {
          throw error
        }
      }
    }
  }

  throw new Error('All providers rate limited. Please try again in a minute.')
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

const PLAYGROUND_SYSTEM_PROMPT = `You are a creative frontend developer who makes VISUALLY STUNNING web experiences.

CRITICAL - OUTPUT FORMAT:
You MUST respond with valid JSON. Use double quotes only. Escape newlines as \\n and quotes as \\".
Example: {"description":"desc","html":"<div>hi</div>","css":"body{color:red}","js":"console.log('hi')"}

DO NOT use backticks or template literals in JSON. All strings must use double quotes.

CRITICAL VISUAL REQUIREMENTS:
1. NEVER use plain rectangles or basic shapes - add gradients, rounded corners, shadows, glows
2. ALWAYS add animations - nothing should be static
3. Use vibrant colors - neon glows, gradients, particle effects
4. Canvas games must have: gradient backgrounds, glowing elements, particle trails, smooth physics
5. UI elements must have: glassmorphism, shadows, hover states, transitions

EXAMPLE - If asked for "bouncing ball", create THIS quality:
- Canvas with gradient or starfield background
- Ball with gradient fill and outer glow (shadowBlur)
- Motion trail using fading circles
- Color that shifts through rainbow using HSL
- Gravity, bounce physics, maybe mouse interaction
- Particle burst on bounce

EXAMPLE - If asked for "button", create THIS quality:
- Gradient background with multiple color stops
- Multiple layered box-shadows for glow effect
- Hover: scale transform, brighter glow, color shift
- Click: ripple effect, press animation
- Pseudo-elements for extra effects

EXAMPLE - If asked for "game", include:
- Gradient/animated background (stars, particles)
- Player with glow/trail effects
- Enemies with distinct visual styles
- Particle explosions on hits
- Floating score with glow
- Smooth requestAnimationFrame loop

CODE STYLE:
- Use template literals for complex strings
- Use HSL colors for easy manipulation
- Use ctx.shadowBlur and ctx.shadowColor for glows
- Use CSS variables for theming
- Add requestAnimationFrame for all animations

Make it look like a professional CodePen demo, not a coding tutorial example.`

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
      let userPrompt = `Create: ${prompt}

Remember: Make it VISUALLY IMPRESSIVE with glows, gradients, animations, and effects. Not a basic tutorial example.`

      // If there's existing code, include it for modifications
      if (currentCode && (currentCode.html || currentCode.css || currentCode.js)) {
        userPrompt = `CURRENT CODE:
HTML: ${currentCode.html || '(empty)'}
CSS: ${currentCode.css || '(empty)'}
JS: ${currentCode.js || '(empty)'}

MODIFY TO: ${prompt}

Keep the visual quality high - gradients, glows, animations.`
      }

      messages.push({ role: 'user', content: userPrompt })

      const { content, tokensUsed } = await callWithRetry(messages, {
        temperature: 0.7,
        max_tokens: 8000,
      })

      // Parse JSON response
      try {
        let jsonStr = content.trim()

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }

        // Find JSON object in response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
        }

        // Fix backtick strings - convert template literals to proper JSON strings
        // This handles cases where AI returns: { "css": `body {...}` }
        jsonStr = jsonStr.replace(/:\s*`([^`]*)`/g, (_, content) => {
          // Escape special characters for JSON
          const escaped = content
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
          return `: "${escaped}"`
        })

        // Also fix standalone backtick strings in arrays or other contexts
        jsonStr = jsonStr.replace(/`([^`]*)`/g, (match, content) => {
          // Only replace if it looks like a string value (not already quoted)
          if (match.includes('\n') || content.length > 10) {
            const escaped = content
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t')
            return `"${escaped}"`
          }
          return match
        })

        const parsed = JSON.parse(jsonStr)

        return NextResponse.json({
          success: true,
          description: parsed.description || 'Code generated',
          html: parsed.html || '',
          css: parsed.css || '',
          js: parsed.js || '',
          tokensUsed,
        })
      } catch (parseError) {
        console.error('JSON parse failed:', parseError)
        console.error('Raw content:', content.substring(0, 500))

        // Last resort: try to extract code blocks manually
        try {
          const descMatch = content.match(/"description"\s*:\s*"([^"]*)"/)
          const htmlMatch = content.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/)
          const cssMatch = content.match(/"css"\s*:\s*"((?:[^"\\]|\\.)*)"/)
          const jsMatch = content.match(/"js"\s*:\s*"((?:[^"\\]|\\.)*)"/)


          if (htmlMatch || cssMatch || jsMatch) {
            return NextResponse.json({
              success: true,
              description: descMatch?.[1] || 'Code generated',
              html: htmlMatch?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || '',
              css: cssMatch?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || '',
              js: jsMatch?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || '',
              tokensUsed,
            })
          }
        } catch {
          // Fall through to error response
        }

        return NextResponse.json({
          success: false,
          error: 'Failed to parse AI response',
          raw: content,
          tokensUsed,
        })
      }
    }

    // Legacy chat mode
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

      const { content, tokensUsed } = await callWithRetry(messages, {
        temperature: 0.7,
        max_tokens: 8000,
      })

      return NextResponse.json({
        code: content,
        response: content,
        action: 'chat',
        tokensUsed,
      })
    }

    // Legacy single-action modes
    let defaultSystemPrompt = `You are an expert programmer. You write clean, efficient, well-documented code.
Always respond with ONLY the code - no explanations, no markdown code blocks, just the raw code.
Use modern best practices and include helpful comments where appropriate.`

    let userPrompt = ''

    if (action === 'generate') {
      userPrompt = `Write ${language || 'JavaScript'} code for: ${prompt}. Return ONLY code.`
    } else if (action === 'improve') {
      userPrompt = `Improve this ${language || 'JavaScript'} code:\n${existingCode}\n${prompt ? `Instructions: ${prompt}` : ''}\nReturn ONLY code.`
    } else if (action === 'explain') {
      defaultSystemPrompt = `You are an expert programmer who explains code clearly.`
      userPrompt = `Explain this ${language || 'JavaScript'} code:\n${existingCode}`
    } else if (action === 'debug') {
      userPrompt = `Debug this ${language || 'JavaScript'} code:\n${existingCode}\n${prompt ? `Issue: ${prompt}` : ''}\nReturn ONLY fixed code.`
    } else if (action === 'convert') {
      userPrompt = `Convert to ${prompt || 'TypeScript'}:\n${existingCode}\nReturn ONLY code.`
    }

    const { content, tokensUsed } = await callWithRetry(
      [
        { role: 'system', content: defaultSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, max_tokens: 4096 }
    )

    let cleanedResult = content
    if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
    }

    return NextResponse.json({
      code: cleanedResult,
      action,
      language,
      tokensUsed,
    })
  } catch (error) {
    console.error('Code generation error:', error)

    // Return specific error messages
    if (error instanceof Error) {
      if (error.message.includes('GROQ_API_KEY')) {
        return NextResponse.json(
          { error: 'AI service not configured. Please add GROQ_API_KEY.' },
          { status: 503 }
        )
      }
      if (error.message.includes('rate') || error.message.includes('429') || error.message.includes('limit')) {
        return NextResponse.json(
          { error: 'Rate limit hit. Wait a moment and try again.' },
          { status: 429 }
        )
      }
      if (error.message.includes('invalid_api_key') || error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Invalid API key. Check GROQ_API_KEY.' },
          { status: 401 }
        )
      }
      // Return actual error message for debugging
      return NextResponse.json(
        { error: `AI Error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate code. Please try again.' },
      { status: 500 }
    )
  }
}

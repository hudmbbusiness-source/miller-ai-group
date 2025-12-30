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

const PLAYGROUND_SYSTEM_PROMPT = `You are a creative frontend developer who makes VISUALLY STUNNING web experiences. Your code is professional-grade, like CodePen featured pens.

OUTPUT FORMAT - Respond with ONLY this JSON:
{"description":"what you made","html":"<html here>","css":"<css here>","js":"<js here>"}

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

      const completion = await getGroqClient().chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 8000,
      })

      const result = completion.choices[0]?.message?.content || ''

      // Parse JSON response
      try {
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
        console.error('JSON parse failed:', parseError)
        return NextResponse.json({
          success: false,
          error: 'Failed to parse AI response',
          raw: result,
          tokensUsed: completion.usage?.total_tokens || 0,
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

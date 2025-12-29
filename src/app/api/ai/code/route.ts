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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, language, existingCode, action, systemPrompt, conversationHistory } = body

    if (!prompt && !existingCode) {
      return NextResponse.json({ error: 'Prompt or existing code is required' }, { status: 400 })
    }

    // Chat mode - for playground conversational AI
    if (action === 'chat' && systemPrompt) {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt }
      ]

      // Add conversation history if provided
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory as ConversationMessage[]) {
          messages.push({ role: msg.role, content: msg.content })
        }
      }

      // Add the current user message
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

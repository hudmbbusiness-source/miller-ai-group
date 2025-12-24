'use server'

import Groq from 'groq-sdk'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export type AIProvider = 'groq' | 'openai' | 'anthropic'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  provider?: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
}

// Provider clients (lazy initialized)
let groqClient: Groq | null = null
let openaiClient: OpenAI | null = null
let anthropicClient: Anthropic | null = null

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqClient
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

// Check which providers are available
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = []
  if (process.env.GROQ_API_KEY) providers.push('groq')
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic')
  return providers
}

// Default models for each provider
const defaultModels: Record<AIProvider, string> = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
}

// Chat with any provider
export async function chat(
  messages: AIMessage[],
  options: ChatOptions = {}
): Promise<{ response: string; provider: AIProvider; model: string }> {
  const {
    provider = 'groq',
    model,
    temperature = 0.7,
    maxTokens = 2048,
  } = options

  const selectedModel = model || defaultModels[provider]

  try {
    switch (provider) {
      case 'groq': {
        const client = getGroqClient()
        if (!client) throw new Error('Groq API key not configured')

        const completion = await client.chat.completions.create({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          temperature,
          max_tokens: maxTokens,
        })

        return {
          response: completion.choices[0]?.message?.content || 'No response generated',
          provider: 'groq',
          model: selectedModel,
        }
      }

      case 'openai': {
        const client = getOpenAIClient()
        if (!client) throw new Error('OpenAI API key not configured')

        const completion = await client.chat.completions.create({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          temperature,
          max_tokens: maxTokens,
        })

        return {
          response: completion.choices[0]?.message?.content || 'No response generated',
          provider: 'openai',
          model: selectedModel,
        }
      }

      case 'anthropic': {
        const client = getAnthropicClient()
        if (!client) throw new Error('Anthropic API key not configured')

        // Anthropic requires system message to be separate
        const systemMessage = messages.find(m => m.role === 'system')
        const chatMessages = messages.filter(m => m.role !== 'system')

        const completion = await client.messages.create({
          model: selectedModel,
          max_tokens: maxTokens,
          system: systemMessage?.content || '',
          messages: chatMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        })

        const textBlock = completion.content.find(block => block.type === 'text')
        return {
          response: textBlock && 'text' in textBlock ? textBlock.text : 'No response generated',
          provider: 'anthropic',
          model: selectedModel,
        }
      }

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (error) {
    console.error(`AI Chat Error (${provider}):`, error)
    throw error
  }
}

// Transcribe audio (Groq Whisper only for now)
export async function transcribeAudio(audioFile: File): Promise<string> {
  const client = getGroqClient()
  if (!client) throw new Error('Groq API key not configured for transcription')

  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3-turbo',
    language: 'en',
    response_format: 'text',
  })

  return transcription as unknown as string
}

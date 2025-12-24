import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

// Lazy-initialize Groq client to avoid build-time errors
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the audio file from the form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Validate file size (max 25MB for Groq)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
    }

    // Transcribe using Groq's Whisper model
    const transcription = await getGroqClient().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      response_format: 'text',
    })

    return NextResponse.json({
      success: true,
      text: transcription,
    })
  } catch (error) {
    console.error('Transcription API Error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
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

    // Check minimum size (at least 1KB of audio data)
    if (audioFile.size < 1000) {
      return NextResponse.json({ error: 'Audio recording too short' }, { status: 400 })
    }

    // Convert File to ArrayBuffer, then to Blob for proper transfer
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBlob = new Blob([arrayBuffer], { type: audioFile.type || 'audio/webm' })

    // Determine file extension from MIME type
    const mimeType = audioFile.type || 'audio/webm'
    let extension = 'webm'
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      extension = 'mp4'
    } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      extension = 'mp3'
    } else if (mimeType.includes('wav')) {
      extension = 'wav'
    }

    // Create a new FormData for Groq API
    const groqFormData = new FormData()
    groqFormData.append('file', audioBlob, `audio.${extension}`)
    groqFormData.append('model', 'whisper-large-v3-turbo')
    groqFormData.append('language', 'en')
    groqFormData.append('response_format', 'json')

    console.log(`Transcribing audio: ${audioFile.size} bytes, type: ${mimeType}, extension: ${extension}`)

    // Call Groq API directly with fetch
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: groqFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq Transcription Error:', response.status, errorText)

      // Parse error for better user feedback
      let errorMessage = 'Transcription failed'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error?.message || errorData.message || 'Transcription failed'
      } catch {
        errorMessage = `Transcription failed (${response.status})`
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const data = await response.json()

    console.log(`Transcription successful: "${data.text?.substring(0, 50)}..."`)

    return NextResponse.json({
      success: true,
      text: data.text || '',
    })
  } catch (error) {
    console.error('Transcription API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}

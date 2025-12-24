'use client'

import { useState, useRef, useCallback } from 'react'

interface UseVoiceRecordingOptions {
  onTranscription?: (text: string) => void
  onError?: (error: string) => void
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  const { onTranscription, onError } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })

      // Create MediaRecorder with supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())

        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })

        // Check if we have audio data
        if (audioBlob.size < 1000) {
          const errMsg = 'Recording too short. Please try again.'
          setError(errMsg)
          onError?.(errMsg)
          return
        }

        // Send to transcription API
        setIsTranscribing(true)
        try {
          const formData = new FormData()
          const extension = mimeType.includes('webm') ? 'webm' : 'mp4'
          formData.append('audio', audioBlob, `recording.${extension}`)

          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Transcription failed')
          }

          const data = await response.json()
          if (data.text) {
            onTranscription?.(data.text)
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Transcription failed'
          setError(errMsg)
          onError?.(errMsg)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errMsg)
      onError?.(errMsg)
    }
  }, [onTranscription, onError])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  return {
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  }
}

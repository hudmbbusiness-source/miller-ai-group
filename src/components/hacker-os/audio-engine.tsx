'use client'

import { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react'

// Audio effect types
export type AudioEffectName =
  | 'button_click'
  | 'button_hover'
  | 'panel_open'
  | 'panel_close'
  | 'glitch'
  | 'boot_beep'
  | 'data_stream'
  | 'notification'
  | 'success'
  | 'error'
  | 'typing'
  | 'whoosh'
  | 'rumble'
  | 'sweep'

export type AmbientTrackName =
  | 'cyberpunk_hum'
  | 'data_pulses'
  | 'system_idle'

// Audio URLs - using Web Audio API generated sounds for reliability
const EFFECT_CONFIGS: Record<AudioEffectName, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  button_click: { frequency: 1200, duration: 0.05, type: 'square', gain: 0.15 },
  button_hover: { frequency: 800, duration: 0.03, type: 'sine', gain: 0.08 },
  panel_open: { frequency: 400, duration: 0.15, type: 'sawtooth', gain: 0.12 },
  panel_close: { frequency: 300, duration: 0.1, type: 'sawtooth', gain: 0.1 },
  glitch: { frequency: 100, duration: 0.08, type: 'square', gain: 0.2 },
  boot_beep: { frequency: 880, duration: 0.1, type: 'sine', gain: 0.15 },
  data_stream: { frequency: 600, duration: 0.2, type: 'triangle', gain: 0.1 },
  notification: { frequency: 1000, duration: 0.15, type: 'sine', gain: 0.12 },
  success: { frequency: 1400, duration: 0.2, type: 'sine', gain: 0.15 },
  error: { frequency: 200, duration: 0.3, type: 'sawtooth', gain: 0.15 },
  typing: { frequency: 2000, duration: 0.02, type: 'square', gain: 0.05 },
  whoosh: { frequency: 500, duration: 0.3, type: 'sine', gain: 0.1 },
  rumble: { frequency: 60, duration: 0.5, type: 'sawtooth', gain: 0.2 },
  sweep: { frequency: 200, duration: 0.4, type: 'sine', gain: 0.15 },
}

interface AudioEngineContextType {
  isInitialized: boolean
  isMuted: boolean
  masterVolume: number
  initialize: () => Promise<void>
  playEffect: (name: AudioEffectName) => void
  playTakeoverSequence: () => void
  startAmbient: (name: AmbientTrackName) => void
  stopAmbient: (name: AmbientTrackName) => void
  setMasterVolume: (volume: number) => void
  toggleMute: () => void
}

const AudioEngineContext = createContext<AudioEngineContextType | null>(null)

export function useAudioEngine() {
  const context = useContext(AudioEngineContext)
  if (!context) {
    throw new Error('useAudioEngine must be used within AudioEngineProvider')
  }
  return context
}

interface AudioEngineProviderProps {
  children: React.ReactNode
}

export function AudioEngineProvider({ children }: AudioEngineProviderProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const ambientNodesRef = useRef<Map<AmbientTrackName, { oscillator: OscillatorNode; gain: GainNode }>>(new Map())
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [masterVolume, setMasterVolumeState] = useState(0.5)

  const initialize = useCallback(async () => {
    if (audioContextRef.current) return

    try {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

      // Resume context if suspended (iOS requirement)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize audio engine:', error)
    }
  }, [])

  const playEffect = useCallback((name: AudioEffectName) => {
    if (!audioContextRef.current || isMuted) return

    const config = EFFECT_CONFIGS[name]
    if (!config) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = config.type
    oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime)

    // Add frequency sweep for certain effects
    if (name === 'sweep' || name === 'whoosh') {
      oscillator.frequency.exponentialRampToValueAtTime(
        config.frequency * 4,
        ctx.currentTime + config.duration
      )
    }

    if (name === 'rumble') {
      oscillator.frequency.exponentialRampToValueAtTime(
        config.frequency * 0.5,
        ctx.currentTime + config.duration
      )
    }

    gainNode.gain.setValueAtTime(config.gain * masterVolume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + config.duration)
  }, [isMuted, masterVolume])

  const playTakeoverSequence = useCallback(() => {
    if (!audioContextRef.current || isMuted) return

    const ctx = audioContextRef.current
    const now = ctx.currentTime

    // Deep rumble
    const rumbleOsc = ctx.createOscillator()
    const rumbleGain = ctx.createGain()
    rumbleOsc.type = 'sawtooth'
    rumbleOsc.frequency.setValueAtTime(40, now)
    rumbleOsc.frequency.exponentialRampToValueAtTime(80, now + 2)
    rumbleGain.gain.setValueAtTime(0, now)
    rumbleGain.gain.linearRampToValueAtTime(0.3 * masterVolume, now + 0.5)
    rumbleGain.gain.linearRampToValueAtTime(0.1 * masterVolume, now + 2)
    rumbleGain.gain.linearRampToValueAtTime(0, now + 3)
    rumbleOsc.connect(rumbleGain)
    rumbleGain.connect(ctx.destination)
    rumbleOsc.start(now)
    rumbleOsc.stop(now + 3)

    // Boot beeps sequence
    const beepTimes = [0.3, 0.5, 0.7, 1.0, 1.2, 1.5, 1.8, 2.2]
    const beepFreqs = [880, 1100, 880, 1320, 880, 1100, 1320, 1760]

    beepTimes.forEach((time, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(beepFreqs[i], now + time)
      gain.gain.setValueAtTime(0.1 * masterVolume, now + time)
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + time)
      osc.stop(now + time + 0.1)
    })

    // Rising sweep
    const sweepOsc = ctx.createOscillator()
    const sweepGain = ctx.createGain()
    sweepOsc.type = 'sine'
    sweepOsc.frequency.setValueAtTime(100, now + 1)
    sweepOsc.frequency.exponentialRampToValueAtTime(2000, now + 3)
    sweepGain.gain.setValueAtTime(0, now + 1)
    sweepGain.gain.linearRampToValueAtTime(0.15 * masterVolume, now + 2)
    sweepGain.gain.linearRampToValueAtTime(0, now + 3)
    sweepOsc.connect(sweepGain)
    sweepGain.connect(ctx.destination)
    sweepOsc.start(now + 1)
    sweepOsc.stop(now + 3)

    // Final confirmation tone
    const finalOsc = ctx.createOscillator()
    const finalGain = ctx.createGain()
    finalOsc.type = 'sine'
    finalOsc.frequency.setValueAtTime(1760, now + 3)
    finalGain.gain.setValueAtTime(0.2 * masterVolume, now + 3)
    finalGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5)
    finalOsc.connect(finalGain)
    finalGain.connect(ctx.destination)
    finalOsc.start(now + 3)
    finalOsc.stop(now + 3.5)
  }, [isMuted, masterVolume])

  const startAmbient = useCallback((name: AmbientTrackName) => {
    if (!audioContextRef.current || isMuted) return
    if (ambientNodesRef.current.has(name)) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()

    // Configure based on track
    switch (name) {
      case 'cyberpunk_hum':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(60, ctx.currentTime)
        lfo.frequency.setValueAtTime(0.1, ctx.currentTime)
        lfoGain.gain.setValueAtTime(5, ctx.currentTime)
        gainNode.gain.setValueAtTime(0.05 * masterVolume, ctx.currentTime)
        break
      case 'data_pulses':
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(200, ctx.currentTime)
        lfo.frequency.setValueAtTime(2, ctx.currentTime)
        lfoGain.gain.setValueAtTime(50, ctx.currentTime)
        gainNode.gain.setValueAtTime(0.03 * masterVolume, ctx.currentTime)
        break
      case 'system_idle':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(100, ctx.currentTime)
        lfo.frequency.setValueAtTime(0.05, ctx.currentTime)
        lfoGain.gain.setValueAtTime(10, ctx.currentTime)
        gainNode.gain.setValueAtTime(0.02 * masterVolume, ctx.currentTime)
        break
    }

    lfo.connect(lfoGain)
    lfoGain.connect(oscillator.frequency)
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    lfo.start()
    oscillator.start()

    ambientNodesRef.current.set(name, { oscillator, gain: gainNode })
  }, [isMuted, masterVolume])

  const stopAmbient = useCallback((name: AmbientTrackName) => {
    const nodes = ambientNodesRef.current.get(name)
    if (!nodes) return

    const ctx = audioContextRef.current
    if (ctx) {
      nodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
      setTimeout(() => {
        nodes.oscillator.stop()
        ambientNodesRef.current.delete(name)
      }, 500)
    }
  }, [])

  const setMasterVolume = useCallback((volume: number) => {
    setMasterVolumeState(Math.max(0, Math.min(1, volume)))
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
    if (!isMuted) {
      // Stop all ambient tracks when muting
      ambientNodesRef.current.forEach((_, name) => {
        stopAmbient(name)
      })
    }
  }, [isMuted, stopAmbient])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ambientNodesRef.current.forEach((nodes) => {
        try {
          nodes.oscillator.stop()
        } catch {
          // Already stopped
        }
      })
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const value: AudioEngineContextType = {
    isInitialized,
    isMuted,
    masterVolume,
    initialize,
    playEffect,
    playTakeoverSequence,
    startAmbient,
    stopAmbient,
    setMasterVolume,
    toggleMute,
  }

  return (
    <AudioEngineContext.Provider value={value}>
      {children}
    </AudioEngineContext.Provider>
  )
}

// Audio control button component
export function AudioControlButton() {
  const { isMuted, toggleMute, isInitialized, initialize } = useAudioEngine()

  const handleClick = async () => {
    if (!isInitialized) {
      await initialize()
    }
    toggleMute()
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-black/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-200"
      style={{
        boxShadow: isMuted ? 'none' : '0 0 20px rgba(0, 255, 255, 0.3)',
      }}
      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
    >
      {isMuted ? (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  )
}

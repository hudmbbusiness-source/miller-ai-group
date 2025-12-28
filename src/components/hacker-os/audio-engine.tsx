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
  playCinematicSoundtrack: (durationSeconds?: number) => () => void
  playIntroSong: () => Promise<void>
  stopIntroSong: () => void
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
  const introSongRef = useRef<HTMLAudioElement | null>(null)
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

  // Full cinematic takeover soundtrack - dramatic electronic music
  const playCinematicSoundtrack = useCallback((durationSeconds: number = 45) => {
    if (!audioContextRef.current || isMuted) return () => {}

    const ctx = audioContextRef.current
    const now = ctx.currentTime
    const bpm = 128 // Beats per minute
    const beatDuration = 60 / bpm
    const nodesForCleanup: (OscillatorNode | AudioBufferSourceNode)[] = []

    // Create master compressor for professional sound
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-24, now)
    compressor.knee.setValueAtTime(30, now)
    compressor.ratio.setValueAtTime(12, now)
    compressor.attack.setValueAtTime(0.003, now)
    compressor.release.setValueAtTime(0.25, now)
    compressor.connect(ctx.destination)

    // ===== DEEP SUB BASS =====
    const createSubBass = () => {
      const sub = ctx.createOscillator()
      const subGain = ctx.createGain()
      const subFilter = ctx.createBiquadFilter()

      sub.type = 'sine'
      sub.frequency.setValueAtTime(35, now)

      subFilter.type = 'lowpass'
      subFilter.frequency.setValueAtTime(100, now)

      subGain.gain.setValueAtTime(0, now)
      subGain.gain.linearRampToValueAtTime(0.25 * masterVolume, now + 2)

      // Pulsing sub bass
      const pulseInterval = beatDuration * 4
      for (let t = 0; t < durationSeconds; t += pulseInterval) {
        subGain.gain.setValueAtTime(0.3 * masterVolume, now + t)
        subGain.gain.linearRampToValueAtTime(0.15 * masterVolume, now + t + pulseInterval * 0.8)
      }

      sub.connect(subFilter)
      subFilter.connect(subGain)
      subGain.connect(compressor)
      sub.start(now)
      sub.stop(now + durationSeconds)
      nodesForCleanup.push(sub)
    }

    // ===== KICK DRUM PATTERN =====
    const createKicks = () => {
      for (let beat = 0; beat < durationSeconds / beatDuration; beat++) {
        const time = now + beat * beatDuration

        // Only kick on certain beats for variation
        if (beat % 4 === 0 || beat % 4 === 2.5) {
          const kick = ctx.createOscillator()
          const kickGain = ctx.createGain()

          kick.type = 'sine'
          kick.frequency.setValueAtTime(150, time)
          kick.frequency.exponentialRampToValueAtTime(40, time + 0.1)

          kickGain.gain.setValueAtTime(0.4 * masterVolume, time)
          kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)

          kick.connect(kickGain)
          kickGain.connect(compressor)
          kick.start(time)
          kick.stop(time + 0.2)
          nodesForCleanup.push(kick)
        }
      }
    }

    // ===== HI-HAT PATTERN =====
    const createHiHats = () => {
      for (let beat = 0; beat < durationSeconds / beatDuration * 2; beat++) {
        const time = now + beat * (beatDuration / 2)

        // Create noise for hi-hat
        const bufferSize = ctx.sampleRate * 0.05
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const output = noiseBuffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1
        }

        const noise = ctx.createBufferSource()
        noise.buffer = noiseBuffer

        const hihatFilter = ctx.createBiquadFilter()
        hihatFilter.type = 'highpass'
        hihatFilter.frequency.setValueAtTime(8000, time)

        const hihatGain = ctx.createGain()
        hihatGain.gain.setValueAtTime(beat % 2 === 1 ? 0.08 * masterVolume : 0.12 * masterVolume, time)
        hihatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)

        noise.connect(hihatFilter)
        hihatFilter.connect(hihatGain)
        hihatGain.connect(compressor)
        noise.start(time)
        noise.stop(time + 0.05)
        nodesForCleanup.push(noise)
      }
    }

    // ===== SYNTH PAD (Atmospheric) =====
    const createSynthPad = () => {
      const padFreqs = [65.41, 82.41, 98.00, 130.81] // C2, E2, G2, C3 - Minor chord

      padFreqs.forEach((freq, i) => {
        const pad = ctx.createOscillator()
        const padGain = ctx.createGain()
        const padFilter = ctx.createBiquadFilter()

        pad.type = 'sawtooth'
        pad.frequency.setValueAtTime(freq, now)
        // Subtle detune for width
        pad.detune.setValueAtTime(i % 2 === 0 ? -5 : 5, now)

        padFilter.type = 'lowpass'
        padFilter.frequency.setValueAtTime(400, now)
        padFilter.frequency.linearRampToValueAtTime(2000, now + 10)
        padFilter.frequency.linearRampToValueAtTime(600, now + 20)

        padGain.gain.setValueAtTime(0, now)
        padGain.gain.linearRampToValueAtTime(0.06 * masterVolume, now + 4)
        padGain.gain.linearRampToValueAtTime(0.04 * masterVolume, now + durationSeconds - 2)
        padGain.gain.linearRampToValueAtTime(0, now + durationSeconds)

        pad.connect(padFilter)
        padFilter.connect(padGain)
        padGain.connect(compressor)
        pad.start(now)
        pad.stop(now + durationSeconds)
        nodesForCleanup.push(pad)
      })
    }

    // ===== ARPEGGIO SYNTH =====
    const createArpeggio = () => {
      const arpNotes = [130.81, 155.56, 196.00, 261.63, 196.00, 155.56] // C, Eb, G, C, G, Eb
      const arpInterval = beatDuration / 3

      for (let t = 4; t < durationSeconds - 2; t += arpInterval) { // Start after 4 seconds
        const noteIndex = Math.floor((t - 4) / arpInterval) % arpNotes.length
        const freq = arpNotes[noteIndex]

        const arp = ctx.createOscillator()
        const arpGain = ctx.createGain()
        const arpFilter = ctx.createBiquadFilter()

        arp.type = 'square'
        arp.frequency.setValueAtTime(freq, now + t)

        arpFilter.type = 'lowpass'
        arpFilter.frequency.setValueAtTime(1500, now + t)

        arpGain.gain.setValueAtTime(0.08 * masterVolume, now + t)
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + t + arpInterval * 0.8)

        arp.connect(arpFilter)
        arpFilter.connect(arpGain)
        arpGain.connect(compressor)
        arp.start(now + t)
        arp.stop(now + t + arpInterval)
        nodesForCleanup.push(arp)
      }
    }

    // ===== GLITCH EFFECTS (Random) =====
    const createGlitchEffects = () => {
      const glitchTimes = [8, 12, 18, 25, 32, 38]

      glitchTimes.forEach(t => {
        if (t < durationSeconds) {
          for (let g = 0; g < 3; g++) {
            const glitch = ctx.createOscillator()
            const glitchGain = ctx.createGain()

            glitch.type = 'square'
            glitch.frequency.setValueAtTime(Math.random() * 2000 + 500, now + t + g * 0.05)

            glitchGain.gain.setValueAtTime(0.15 * masterVolume, now + t + g * 0.05)
            glitchGain.gain.exponentialRampToValueAtTime(0.001, now + t + g * 0.05 + 0.04)

            glitch.connect(glitchGain)
            glitchGain.connect(compressor)
            glitch.start(now + t + g * 0.05)
            glitch.stop(now + t + g * 0.05 + 0.04)
            nodesForCleanup.push(glitch)
          }
        }
      })
    }

    // ===== RISERS (Build tension) =====
    const createRisers = () => {
      const riserTimes = [15, 30] // Build tension at these points

      riserTimes.forEach(t => {
        if (t < durationSeconds - 5) {
          const riser = ctx.createOscillator()
          const riserGain = ctx.createGain()
          const riserFilter = ctx.createBiquadFilter()

          riser.type = 'sawtooth'
          riser.frequency.setValueAtTime(100, now + t)
          riser.frequency.exponentialRampToValueAtTime(2000, now + t + 4)

          riserFilter.type = 'lowpass'
          riserFilter.frequency.setValueAtTime(500, now + t)
          riserFilter.frequency.exponentialRampToValueAtTime(8000, now + t + 4)

          riserGain.gain.setValueAtTime(0, now + t)
          riserGain.gain.linearRampToValueAtTime(0.2 * masterVolume, now + t + 3.5)
          riserGain.gain.linearRampToValueAtTime(0, now + t + 4)

          riser.connect(riserFilter)
          riserFilter.connect(riserGain)
          riserGain.connect(compressor)
          riser.start(now + t)
          riser.stop(now + t + 4)
          nodesForCleanup.push(riser)
        }
      })
    }

    // Start all elements
    createSubBass()
    createKicks()
    createHiHats()
    createSynthPad()
    createArpeggio()
    createGlitchEffects()
    createRisers()

    // Return cleanup function
    return () => {
      nodesForCleanup.forEach(node => {
        try {
          node.stop()
        } catch {
          // Already stopped
        }
      })
    }
  }, [isMuted, masterVolume])

  // Play the actual intro song MP3 file
  const playIntroSong = useCallback(async () => {
    if (isMuted) return

    try {
      // Stop any existing intro song
      if (introSongRef.current) {
        introSongRef.current.pause()
        introSongRef.current.currentTime = 0
      }

      // Create new audio element
      const audio = new Audio('/audio/intro-song.mp3')
      audio.volume = masterVolume
      introSongRef.current = audio

      // Play the song
      await audio.play()
    } catch (error) {
      console.error('Failed to play intro song:', error)
    }
  }, [isMuted, masterVolume])

  // Stop the intro song
  const stopIntroSong = useCallback(() => {
    if (introSongRef.current) {
      introSongRef.current.pause()
      introSongRef.current.currentTime = 0
      introSongRef.current = null
    }
  }, [])

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
    playCinematicSoundtrack,
    playIntroSong,
    stopIntroSong,
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

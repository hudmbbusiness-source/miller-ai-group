'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAudioEngine } from './audio-engine'
import { TerminalFeed, generateSystemLog, TAKEOVER_LOGS, type LogEntry } from './terminal-feed'

interface SystemTakeoverSequenceProps {
  onComplete: () => void
  userName?: string
}

type TakeoverPhase =
  | 'idle'
  | 'glitch_start'
  | 'hex_grid'
  | 'boot_sequence'
  | 'logo_reveal'
  | 'partners'
  | 'system_online'
  | 'complete'

export function SystemTakeoverSequence({
  onComplete,
  userName = 'Operator',
}: SystemTakeoverSequenceProps) {
  const [phase, setPhase] = useState<TakeoverPhase>('idle')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [bootText, setBootText] = useState('')
  const [hexGrid, setHexGrid] = useState<{ x: number; y: number; opacity: number }[]>([])
  const [glitchIntensity, setGlitchIntensity] = useState(0)
  const logIndexRef = useRef(0)

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  // Generate hex grid
  useEffect(() => {
    const grid: { x: number; y: number; opacity: number }[] = []
    const cols = Math.ceil(window.innerWidth / 60)
    const rows = Math.ceil(window.innerHeight / 60)

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        grid.push({
          x: i * 60,
          y: j * 60,
          opacity: 0,
        })
      }
    }
    setHexGrid(grid)
  }, [])

  // Add log entry with typing effect
  const addLog = useCallback(() => {
    if (logIndexRef.current >= TAKEOVER_LOGS.length) return

    const logData = TAKEOVER_LOGS[logIndexRef.current]
    const newLog = generateSystemLog(logData.message, logData.level, logData.source)
    setLogs(prev => [...prev, newLog])
    logIndexRef.current++

    audioEngine?.playEffect('typing')
  }, [audioEngine])

  // Start the takeover sequence
  const startSequence = useCallback(async () => {
    // Phase 1: Initial glitch
    setPhase('glitch_start')
    audioEngine?.playTakeoverSequence()
    setGlitchIntensity(1)

    await new Promise(r => setTimeout(r, 300))
    setGlitchIntensity(0.5)

    // Phase 2: Hex grid cascade
    setPhase('hex_grid')
    setHexGrid(prev => prev.map((hex, i) => ({
      ...hex,
      opacity: 1,
    })))

    await new Promise(r => setTimeout(r, 800))

    // Phase 3: Boot sequence with terminal
    setPhase('boot_sequence')
    setBootText('INITIALIZING MILLER AI GROUP OS...')

    // Add logs progressively
    for (let i = 0; i < TAKEOVER_LOGS.length; i++) {
      await new Promise(r => setTimeout(r, 150))
      addLog()
    }

    await new Promise(r => setTimeout(r, 500))

    // Phase 4: Logo reveal
    setPhase('logo_reveal')
    audioEngine?.playEffect('success')

    await new Promise(r => setTimeout(r, 1500))

    // Phase 5: Partner logos
    setPhase('partners')

    await new Promise(r => setTimeout(r, 1500))

    // Phase 6: System online
    setPhase('system_online')
    audioEngine?.playEffect('notification')

    await new Promise(r => setTimeout(r, 1500))

    // Complete
    setPhase('complete')
    onComplete()
  }, [audioEngine, addLog, onComplete])

  // Auto-start when component mounts
  useEffect(() => {
    const timer = setTimeout(startSequence, 100)
    return () => clearTimeout(timer)
  }, [startSequence])

  return (
    <AnimatePresence mode="wait">
      {phase !== 'complete' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[1000] bg-black overflow-hidden"
          style={{
            filter: glitchIntensity > 0 ? `hue-rotate(${glitchIntensity * 30}deg)` : 'none',
          }}
        >
          {/* Hex grid background */}
          <div className="absolute inset-0">
            {hexGrid.map((hex, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: phase === 'hex_grid' || phase === 'boot_sequence' ? hex.opacity * 0.3 : 0,
                  scale: 1,
                }}
                transition={{ delay: i * 0.002, duration: 0.3 }}
                className="absolute w-12 h-12"
                style={{ left: hex.x, top: hex.y }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon
                    points="50,5 95,25 95,75 50,95 5,75 5,25"
                    fill="none"
                    stroke="rgba(0, 255, 255, 0.2)"
                    strokeWidth="1"
                  />
                </svg>
              </motion.div>
            ))}
          </div>

          {/* Glitch overlay */}
          {glitchIntensity > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: glitchIntensity }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.1) 2px, rgba(0, 255, 255, 0.1) 4px)',
              }}
            />
          )}

          {/* Boot sequence with terminal */}
          <AnimatePresence>
            {(phase === 'boot_sequence' || phase === 'logo_reveal') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-cyan-400 text-lg md:text-2xl font-mono mb-6 text-center"
                >
                  {bootText}
                </motion.div>

                <div className="w-full max-w-2xl">
                  <TerminalFeed
                    logs={logs}
                    maxHeight="300px"
                    autoScroll
                    title="BOOT SEQUENCE"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main logo reveal */}
          <AnimatePresence>
            {phase === 'logo_reveal' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 60px rgba(0, 255, 255, 0.3)',
                        '0 0 120px rgba(0, 255, 255, 0.5)',
                        '0 0 60px rgba(0, 255, 255, 0.3)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl"
                  />

                  <motion.div
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="relative z-10 bg-black/80 p-8 rounded-2xl border border-cyan-500/50"
                  >
                    <Image
                      src="/logos/miller-ai-group.png"
                      alt="Miller AI Group"
                      width={200}
                      height={200}
                      className="w-32 h-32 md:w-48 md:h-48 object-contain"
                      priority
                    />
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center text-cyan-400 font-mono text-lg mt-4"
                    >
                      MILLER AI GROUP
                    </motion.p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Partner logos */}
          <AnimatePresence>
            {phase === 'partners' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-8"
              >
                <motion.p
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-neutral-400 font-mono text-sm uppercase tracking-wider"
                >
                  In collaboration with
                </motion.p>

                <div className="flex items-center gap-8 md:gap-16">
                  {/* CozyFilmz */}
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl bg-black/60 border border-purple-500/30 p-3 flex items-center justify-center">
                      <Image
                        src="/logos/cozyfilmz.png"
                        alt="CozyFilmz"
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-purple-400 text-xs mt-2 font-mono">COZYFILMZ</p>
                    <p className="text-neutral-500 text-[10px] font-mono">Creative Partner</p>
                  </motion.div>

                  {/* Arcene Studios */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl bg-black/60 border border-amber-500/30 p-3 flex items-center justify-center">
                      <Image
                        src="/logos/arcene.png"
                        alt="Arcene Studios"
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-amber-400 text-xs mt-2 font-mono">ARCENE STUDIOS</p>
                    <p className="text-neutral-500 text-[10px] font-mono">Technology Partner</p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* System online */}
          <AnimatePresence>
            {phase === 'system_online' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                {/* Radial burst */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute w-64 h-64 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
                  }}
                />

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{
                      textShadow: [
                        '0 0 20px rgba(0, 255, 255, 0.5)',
                        '0 0 40px rgba(0, 255, 255, 0.8)',
                        '0 0 20px rgba(0, 255, 255, 0.5)',
                      ],
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-4xl md:text-6xl font-bold text-cyan-400 font-mono"
                  >
                    SYSTEM ONLINE
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-neutral-400 mt-4 font-mono"
                  >
                    Welcome, {userName}
                  </motion.p>
                </motion.div>

                {/* Corner decorations */}
                <div className="absolute top-8 left-8 text-cyan-500/50 font-mono text-xs">
                  <div>OPERATOR: {userName.toUpperCase()}</div>
                  <div>STATUS: AUTHORIZED</div>
                </div>
                <div className="absolute top-8 right-8 text-cyan-500/50 font-mono text-xs text-right">
                  <div>SESSION: {Date.now().toString(16).toUpperCase()}</div>
                  <div>SECURITY: MAX</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.02]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            }}
          />

          {/* Progress indicator */}
          {phase !== 'idle' && phase !== 'complete' && (
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex gap-2">
                {['glitch_start', 'hex_grid', 'boot_sequence', 'logo_reveal', 'partners', 'system_online'].map((p, i) => (
                  <motion.div
                    key={p}
                    className={`w-2 h-2 rounded-full ${
                      phase === p
                        ? 'bg-cyan-400'
                        : ['glitch_start', 'hex_grid', 'boot_sequence', 'logo_reveal', 'partners', 'system_online'].indexOf(phase) > i
                          ? 'bg-cyan-400/50'
                          : 'bg-neutral-700'
                    }`}
                    animate={phase === p ? { scale: [1, 1.5, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

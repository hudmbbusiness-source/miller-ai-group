'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================
// TYPES
// ============================================
interface CinematicTakeoverProps {
  onComplete: () => void
  userName?: string
}

// Re-export empty CHARACTERS for backwards compatibility
export const CHARACTERS: never[] = []

// ============================================
// DEDSEC STYLE GLITCH BACKGROUND
// ============================================
function GlitchBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let frame = 0
    let animationId: number

    const animate = () => {
      frame++

      // Pure black base
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Scanlines
      for (let y = 0; y < canvas.height; y += 2) {
        ctx.fillStyle = `rgba(255,255,255,0.02)`
        ctx.fillRect(0, y, canvas.width, 1)
      }

      // Random glitch blocks - aggressive
      if (Math.random() > 0.7) {
        for (let i = 0; i < 8; i++) {
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height
          const w = Math.random() * 300 + 50
          const h = Math.random() * 15 + 2
          ctx.fillStyle = Math.random() > 0.5
            ? `rgba(255,0,100,${Math.random() * 0.4})`
            : `rgba(0,255,65,${Math.random() * 0.3})`
          ctx.fillRect(x, y, w, h)
        }
      }

      // Horizontal tear
      if (Math.random() > 0.85) {
        const y = Math.random() * canvas.height
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`
        ctx.fillRect(0, y, canvas.width, Math.random() * 4 + 1)
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />
}

// ============================================
// FAST TERMINAL HACK SCENE
// ============================================
function HackSequence({ onComplete, userName }: { onComplete: () => void; userName: string }) {
  const [lines, setLines] = useState<string[]>([])
  const [phase, setPhase] = useState<'init' | 'hack' | 'owned'>('init')

  const hackLines = [
    '> SCANNING TARGET...',
    '> VULNERABILITIES FOUND: 47',
    '> EXPLOITING CVE-2024-XXXX...',
    '> BYPASSING FIREWALL ████████████ DONE',
    '> INJECTING PAYLOAD...',
    '> ROOT ACCESS GRANTED',
    '> DUMPING CREDENTIALS...',
    `> TARGET ACQUIRED: ${userName.toUpperCase()}`,
    '> INSTALLING BACKDOOR...',
    '> SYSTEM COMPROMISED',
  ]

  // Phase 1: Initial glitch (2 seconds)
  useEffect(() => {
    const initTimer = setTimeout(() => setPhase('hack'), 2000)
    return () => clearTimeout(initTimer)
  }, [])

  // Phase 2: Hack sequence (~4 seconds - 10 lines at 400ms)
  useEffect(() => {
    if (phase !== 'hack') return

    let lineIndex = 0
    const typeInterval = setInterval(() => {
      if (lineIndex < hackLines.length) {
        setLines(prev => [...prev, hackLines[lineIndex]])
        lineIndex++
      } else {
        clearInterval(typeInterval)
        setTimeout(() => setPhase('owned'), 500)
      }
    }, 400)

    return () => clearInterval(typeInterval)
  }, [phase])

  // Phase 3: Owned screen (5 seconds)
  useEffect(() => {
    if (phase === 'owned') {
      const timer = setTimeout(onComplete, 5000)
      return () => clearTimeout(timer)
    }
  }, [phase, onComplete])

  // Initial glitch phase
  if (phase === 'init') {
    return (
      <motion.div
        className="fixed inset-0 z-20 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <GlitchBackground />
        <motion.div
          className="text-6xl md:text-8xl font-mono font-bold text-red-500"
          style={{ textShadow: '0 0 30px rgba(255,0,50,0.8), 4px 0 0 #00ff41, -4px 0 0 #ff0080' }}
          animate={{
            opacity: [0, 1, 0.5, 1],
            x: [0, -10, 10, -5, 5, 0],
            scale: [1, 1.02, 0.98, 1],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          BREACH DETECTED
        </motion.div>
      </motion.div>
    )
  }

  if (phase === 'owned') {
    return (
      <motion.div
        className="fixed inset-0 z-20 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <GlitchBackground />

        <div className="relative z-10 text-center">
          {/* DedSec style skull ASCII */}
          <motion.pre
            className="text-red-500 text-xs md:text-sm font-mono mb-6 leading-tight"
            style={{ textShadow: '0 0 20px rgba(255,0,50,0.8)' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
{`
    ██████╗ ██╗    ██╗███╗   ██╗███████╗██████╗
    ██╔══██╗██║    ██║████╗  ██║██╔════╝██╔══██╗
    ██████╔╝██║ █╗ ██║██╔██╗ ██║█████╗  ██║  ██║
    ██╔═══╝ ██║███╗██║██║╚██╗██║██╔══╝  ██║  ██║
    ██║     ╚███╔███╔╝██║ ╚████║███████╗██████╔╝
    ╚═╝      ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝╚═════╝
`}
          </motion.pre>

          {/* SYSTEM OWNED */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold font-mono mb-4"
            style={{
              color: '#ff0040',
              textShadow: '0 0 40px rgba(255,0,64,0.9), 3px 0 0 #00ff41, -3px 0 0 #ff0080',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: [0, -3, 3, -2, 0],
            }}
            transition={{ duration: 0.4 }}
          >
            SYSTEM OWNED
          </motion.h1>

          {/* Miller AI Group */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <p className="text-xl md:text-2xl font-mono text-green-500 mb-2"
               style={{ textShadow: '0 0 15px rgba(0,255,65,0.6)' }}>
              MILLER AI GROUP
            </p>
            <p className="text-sm font-mono text-neutral-500">
              Welcome, {userName}
            </p>
          </motion.div>

          {/* Blinking cursor */}
          <motion.div
            className="mt-6 text-green-500 font-mono text-sm"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            █ ACCESS GRANTED
          </motion.div>
        </div>

        {/* Corner glitch elements */}
        <div className="absolute top-4 left-4 font-mono text-xs text-red-500/60">
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.5, repeat: Infinity }}>
            ● REC
          </motion.div>
        </div>
        <div className="absolute top-4 right-4 font-mono text-xs text-green-500/60">
          BREACH COMPLETE
        </div>
        <div className="absolute bottom-4 left-4 font-mono text-xs text-neutral-600">
          SESSION: {Date.now().toString(16).toUpperCase()}
        </div>
        <div className="absolute bottom-4 right-4 font-mono text-xs text-neutral-600">
          v2.0.0
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black p-6 md:p-12 font-mono overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <GlitchBackground />

      {/* Terminal window */}
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Terminal header */}
        <div className="flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-t border-b border-green-500/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-green-400 ml-3">root@miller-ai:~#</span>
          <motion.span
            className="ml-auto text-xs text-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            ● BREACHING
          </motion.span>
        </div>

        {/* Terminal content */}
        <div className="bg-black/90 p-4 rounded-b border border-green-500/20 min-h-[300px]">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }}
              className={`text-sm md:text-base leading-relaxed ${
                line?.includes('DONE') || line?.includes('GRANTED') || line?.includes('COMPROMISED')
                  ? 'text-green-400'
                  : line?.includes('TARGET')
                    ? 'text-red-400'
                    : 'text-neutral-300'
              }`}
            >
              {line}
            </motion.div>
          ))}

          {/* Blinking cursor */}
          <motion.span
            className="text-green-400"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          >
            █
          </motion.span>
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between font-mono text-xs text-neutral-600">
        <span>MILLER AI GROUP // SYSTEM BREACH</span>
        <span className="text-green-500">PROGRESS: {Math.min(100, Math.round((lines.length / hackLines.length) * 100))}%</span>
      </div>
    </motion.div>
  )
}

// ============================================
// MAIN CINEMATIC TAKEOVER - SIMPLE & FAST
// ============================================
export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  return (
    <div
      className="fixed inset-0 bg-black z-50"
      role="application"
      aria-label="System breach sequence"
    >
      <HackSequence onComplete={onComplete} userName={userName} />
    </div>
  )
}

export type { CinematicTakeoverProps }

'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Terminal, Wifi, Lock, Cpu, Database, Globe, Zap } from 'lucide-react'

// ============================================================================
// GREEN HACKER CODE INTRO - Matches login page style
// ============================================================================

interface CinematicSceneProps {
  onComplete: () => void
  audioSrc?: string
}

// Random hacker code strings
const CODE_STRINGS = [
  'INIT_SEQUENCE_0x7FF...',
  'LOADING_KERNEL_MODULE...',
  'BYPASS_AUTH_PROTOCOL...',
  'DECRYPT_AES_256_KEY...',
  'ESTABLISH_SECURE_CONN...',
  'INJECT_PAYLOAD_0xDEAD...',
  'SCANNING_NETWORK_NODES...',
  'ROOT_ACCESS_GRANTED...',
  'FIREWALL_BREACH_SUCCESS...',
  'EXTRACTING_DATA_STREAM...',
  'COMPILE_EXPLOIT_v2.0...',
  'MASK_IP_TRACE_ROUTE...',
  'INIT_BACKDOOR_ACCESS...',
  'OVERRIDE_SECURITY_CHECK...',
  'SYNC_REMOTE_SERVERS...',
]

// System popup messages
const POPUPS = [
  { title: 'BREACH DETECTED', message: 'Unauthorized access attempt logged', type: 'warning' },
  { title: 'FIREWALL BYPASS', message: 'Security protocols disabled', type: 'success' },
  { title: 'ROOT ACCESS', message: 'Elevated privileges obtained', type: 'success' },
  { title: 'DATA STREAM', message: 'Encrypted channel established', type: 'info' },
]

// Matrix rain character
function MatrixColumn({ delay, duration, x }: { delay: number; duration: number; x: number }) {
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
  const [text, setText] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setText(prev => {
        const newChar = chars[Math.floor(Math.random() * chars.length)]
        const updated = newChar + prev
        return updated.slice(0, 30)
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: [0, 1, 1, 0], y: ['-100%', '100%'] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
      className="absolute text-green-500 text-xs font-mono whitespace-pre leading-tight"
      style={{
        left: x,
        textShadow: '0 0 10px rgba(0,255,0,0.8)',
        writingMode: 'vertical-rl',
      }}
    >
      {text}
    </motion.div>
  )
}

// Popup component
function SystemPopup({
  popup,
  index,
  onClose
}: {
  popup: typeof POPUPS[0]
  index: number
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000)
    return () => clearTimeout(timer)
  }, [onClose])

  const positions = [
    { top: '15%', left: '8%' },
    { top: '18%', right: '8%' },
    { top: '55%', left: '5%' },
    { top: '60%', right: '6%' },
  ]

  const pos = positions[index % positions.length]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 50 }}
      className="fixed z-40 w-64"
      style={pos}
    >
      <div className="border border-green-500/50 bg-black/95 backdrop-blur-sm">
        {/* Header */}
        <div className={`px-3 py-1.5 border-b border-green-900/50 flex items-center justify-between ${
          popup.type === 'warning' ? 'bg-yellow-900/20' :
          popup.type === 'success' ? 'bg-green-900/20' : 'bg-blue-900/20'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              popup.type === 'warning' ? 'bg-yellow-500' :
              popup.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <span className="text-green-400 text-xs font-bold font-mono">{popup.title}</span>
          </div>
          <span className="text-green-700 text-xs">×</span>
        </div>
        {/* Body */}
        <div className="p-3">
          <p className="text-green-500 text-xs font-mono">{popup.message}</p>
          <div className="mt-2 h-1 bg-green-900/30 rounded overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'linear' }}
              className="h-full bg-green-500"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Code stream line
function CodeLine({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="text-xs font-mono"
    >
      <span className="text-green-700">[{new Date().toLocaleTimeString()}]</span>
      <span className="text-green-500 ml-2">{text}</span>
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: 3 }}
        className="text-green-400 ml-1"
      >
        ✓
      </motion.span>
    </motion.div>
  )
}

export function CinematicScene({
  onComplete,
  audioSrc = '/audio/intro-song.mp3',
}: CinematicSceneProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [phase, setPhase] = useState(0)
  const [codeLines, setCodeLines] = useState<string[]>([])
  const [activePopups, setActivePopups] = useState<number[]>([])
  const [showTitle, setShowTitle] = useState(false)
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Play audio
    const playAudio = async () => {
      try {
        if (audioRef.current) {
          audioRef.current.volume = 0.7
          await audioRef.current.play()
        }
      } catch (e) {
        console.warn('Audio autoplay blocked:', e)
      }
    }
    playAudio()

    // Fade out audio
    const startFadeOut = () => {
      if (audioRef.current) {
        fadeIntervalRef.current = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.05) {
            audioRef.current.volume -= 0.05
          } else if (audioRef.current) {
            audioRef.current.volume = 0
            audioRef.current.pause()
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
          }
        }, 100)
      }
    }

    // Timeline - show title earlier and clear popups
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 1500)
    const t3 = setTimeout(() => {
      setActivePopups([]) // Clear all popups
      setShowTitle(true)
    }, 4000)
    const t4 = setTimeout(() => startFadeOut(), 6000)
    const t5 = setTimeout(() => onComplete(), 7500)

    // Add code lines progressively
    const codeInterval = setInterval(() => {
      setCodeLines(prev => {
        if (prev.length >= 10) return prev
        const newLine = CODE_STRINGS[Math.floor(Math.random() * CODE_STRINGS.length)]
        return [...prev, newLine]
      })
    }, 350)

    // Trigger popups - fewer and earlier so they clear before title
    const popupTimers = POPUPS.map((_, i) =>
      setTimeout(() => {
        setActivePopups(prev => [...prev, i])
      }, 800 + i * 600)
    )

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
      clearInterval(codeInterval)
      popupTimers.forEach(clearTimeout)
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
    }
  }, [onComplete])

  const handleSkip = useCallback(() => {
    if (audioRef.current) audioRef.current.pause()
    onComplete()
  }, [onComplete])

  const removePopup = useCallback((index: number) => {
    setActivePopups(prev => prev.filter(i => i !== index))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black overflow-hidden"
    >
      <audio ref={audioRef} src={audioSrc} preload="auto" />

      {/* CRT Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-[60] opacity-20"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 2px)',
        }}
      />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Matrix rain */}
      {phase >= 1 && !showTitle && (
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {[...Array(20)].map((_, i) => (
            <MatrixColumn
              key={i}
              delay={i * 0.2}
              duration={4 + Math.random() * 3}
              x={i * 5 + Math.random() * 3}
            />
          ))}
        </div>
      )}

      {/* Top HUD - hide when title shows */}
      {!showTitle && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -20 }}
          className="absolute top-0 left-0 right-0 z-30 border-b border-green-900/50 bg-black/80"
        >
          <div className="flex items-center justify-between px-4 py-2 text-xs font-mono">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-500">SYSTEM ACTIVE</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-green-700">
                <Wifi className="w-3 h-3" />
                <span>ENCRYPTED</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-green-600">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                AES-256
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Code terminal - hide when title shows */}
      {!showTitle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 1 ? 1 : 0 }}
          className="absolute left-4 top-16 w-72 max-h-[35vh] overflow-hidden"
        >
          <div className="border border-green-900/50 bg-black/80 p-3">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-900/30">
              <Terminal className="w-3 h-3 text-green-500" />
              <span className="text-green-600 text-xs font-mono">system_init.log</span>
            </div>
            <div className="space-y-1">
              {codeLines.map((line, i) => (
                <CodeLine key={i} text={line} delay={0} />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* System stats panel - hide when title shows */}
      {!showTitle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ delay: 0.3 }}
          className="absolute right-4 top-16 w-56"
        >
          <div className="border border-green-900/50 bg-black/80 p-3">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-900/30">
              <Cpu className="w-3 h-3 text-green-500" />
              <span className="text-green-600 text-xs font-mono">SYSTEM METRICS</span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: 'CPU', value: 94, icon: Cpu },
                { label: 'MEMORY', value: 78, icon: Database },
                { label: 'NETWORK', value: 100, icon: Globe },
                { label: 'POWER', value: 100, icon: Zap },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <stat.icon className="w-3 h-3 text-green-700" />
                  <span className="text-green-700 w-14">{stat.label}</span>
                  <div className="flex-1 h-1.5 bg-green-900/30 rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                      className="h-full bg-green-500"
                    />
                  </div>
                  <span className="text-green-500 w-7 text-right">{stat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Popups - lower z-index than title */}
      <AnimatePresence>
        {activePopups.map((popupIndex) => (
          <SystemPopup
            key={popupIndex}
            popup={POPUPS[popupIndex]}
            index={popupIndex}
            onClose={() => removePopup(popupIndex)}
          />
        ))}
      </AnimatePresence>

      {/* CENTER TITLE - Highest z-index, full screen takeover */}
      <AnimatePresence>
        {showTitle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black"
          >
            {/* Subtle glow behind */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at center, rgba(0,255,0,0.15) 0%, transparent 50%)',
              }}
            />

            <div className="text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-center gap-4 mb-6"
              >
                <Shield className="w-12 h-12 text-green-500" style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,0,0.8))' }} />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-5xl sm:text-6xl md:text-8xl font-black font-mono tracking-wider text-green-500"
                style={{ textShadow: '0 0 40px rgba(0,255,0,0.9), 0 0 80px rgba(0,255,0,0.5), 0 0 120px rgba(0,255,0,0.3)' }}
              >
                MILLER AI GROUP
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-green-600 text-lg font-mono mt-6 tracking-[0.4em]"
              >
                SYSTEM INITIALIZED
              </motion.p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="mx-auto mt-8 h-0.5 w-64 bg-green-500 origin-center"
                style={{ boxShadow: '0 0 15px rgba(0,255,0,0.9)' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom HUD - hide when title shows */}
      {!showTitle && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
          className="absolute bottom-0 left-0 right-0 z-30 border-t border-green-900/50 bg-black/80"
        >
          <div className="flex items-center justify-between px-4 py-2 text-xs font-mono text-green-700">
            <div className="flex items-center gap-4">
              <span>TERMINAL: ACTIVE</span>
              <span className="hidden sm:inline">FIREWALL: BYPASSED</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-green-500">● CONNECTED</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Skip button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.5 }}
        onClick={handleSkip}
        className="absolute bottom-8 right-4 z-[110] px-4 py-2 text-green-600 text-xs font-mono border border-green-900/50 hover:border-green-500/50 hover:text-green-400 transition-colors bg-black/50"
      >
        SKIP →
      </motion.button>
    </motion.div>
  )
}

export default CinematicScene

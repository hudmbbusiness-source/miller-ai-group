'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

// ============================================
// NEON DATA STREAMS - GPU-accelerated canvas
// ============================================
interface DataStreamProps {
  intensity?: number
  colors?: string[]
  speed?: number
}

export function NeonDataStreams({
  intensity = 1,
  colors = ['#ff00ff', '#9d00ff', '#00ff41', '#ffd700'],
  speed = 1
}: DataStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const streamsRef = useRef<Array<{
    x: number
    y: number
    speed: number
    length: number
    color: string
    opacity: number
    chars: string[]
  }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStreams()
    }

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン$¥€£₿∑∆∏∫∂√∞≈≠≤≥'.split('')

    const initStreams = () => {
      const count = Math.floor((canvas.width / 20) * intensity)
      streamsRef.current = []
      for (let i = 0; i < count; i++) {
        streamsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          speed: (Math.random() * 3 + 2) * speed,
          length: Math.floor(Math.random() * 20 + 10),
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.5 + 0.3,
          chars: Array.from({ length: 30 }, () => chars[Math.floor(Math.random() * chars.length)])
        })
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      streamsRef.current.forEach(stream => {
        stream.y += stream.speed

        for (let i = 0; i < stream.length; i++) {
          const charY = stream.y - i * 18
          if (charY < 0 || charY > canvas.height) continue

          const alpha = ((stream.length - i) / stream.length) * stream.opacity
          ctx.fillStyle = stream.color
          ctx.globalAlpha = alpha
          ctx.font = '14px monospace'
          ctx.fillText(stream.chars[i % stream.chars.length], stream.x, charY)

          // Glow effect for leading character
          if (i === 0) {
            ctx.shadowBlur = 20
            ctx.shadowColor = stream.color
            ctx.fillText(stream.chars[0], stream.x, charY)
            ctx.shadowBlur = 0
          }
        }

        // Reset when off screen
        if (stream.y - stream.length * 18 > canvas.height) {
          stream.y = -stream.length * 18
          stream.x = Math.random() * canvas.width
        }
      })

      ctx.globalAlpha = 1
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [intensity, colors, speed])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />
}

// ============================================
// HOLOGRAPHIC GRID
// ============================================
export function HolographicGrid({
  color = '#ff00ff',
  perspective = true,
  animated = true
}: {
  color?: string
  perspective?: boolean
  animated?: boolean
}) {
  return (
    <motion.div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Horizontal lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${color}20 1px, transparent 1px)
          `,
          backgroundSize: '100% 40px',
          transform: perspective ? 'perspective(500px) rotateX(60deg)' : 'none',
          transformOrigin: 'center bottom',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
        }}
      />

      {/* Vertical lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${color}15 1px, transparent 1px)
          `,
          backgroundSize: '60px 100%',
          transform: perspective ? 'perspective(500px) rotateX(60deg)' : 'none',
          transformOrigin: 'center bottom',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
        }}
      />

      {/* Scanning line */}
      {animated && (
        <motion.div
          className="absolute left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
          }}
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </motion.div>
  )
}

// ============================================
// GLITCH OVERLAY EFFECT
// ============================================
export function GlitchOverlay({
  active = false,
  intensity = 'medium'
}: {
  active?: boolean
  intensity?: 'low' | 'medium' | 'high'
}) {
  const intensityValues = {
    low: { frequency: 3000, duration: 50 },
    medium: { frequency: 1500, duration: 100 },
    high: { frequency: 500, duration: 150 },
  }

  const config = intensityValues[intensity]

  return (
    <motion.div
      className="fixed inset-0 z-50 pointer-events-none"
      animate={active ? {
        opacity: [0, 0.8, 0, 0.5, 0],
        x: [0, -5, 3, -2, 0],
        scaleX: [1, 1.02, 0.98, 1.01, 1],
      } : { opacity: 0 }}
      transition={{
        duration: config.duration / 1000,
        repeat: active ? Infinity : 0,
        repeatDelay: config.frequency / 1000,
      }}
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.03) 2px, rgba(255,0,255,0.03) 4px)',
        mixBlendMode: 'screen',
      }}
    />
  )
}

// ============================================
// ENCRYPTED GLYPHS EFFECT
// ============================================
export function EncryptedGlyphs({
  text,
  decrypted = false,
  color = '#ff00ff',
  className = ''
}: {
  text: string
  decrypted?: boolean
  color?: string
  className?: string
}) {
  const glyphChars = '!@#$%^&*(){}[]|\\/<>?~`αβγδεζηθικλμνξοπρστυφχψω'

  return (
    <motion.span
      className={`font-mono ${className}`}
      style={{ color }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={decrypted ? {
            opacity: 1,
          } : {
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: decrypted ? 0.1 : 0.5,
            delay: i * 0.03,
            repeat: decrypted ? 0 : Infinity,
          }}
        >
          {decrypted ? char : glyphChars[Math.floor(Math.random() * glyphChars.length)]}
        </motion.span>
      ))}
    </motion.span>
  )
}

// ============================================
// SYSTEM LOG TERMINAL
// ============================================
interface LogEntry {
  text: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  timestamp?: string
}

export function SystemLogTerminal({
  logs,
  speed = 50,
  className = ''
}: {
  logs: LogEntry[]
  speed?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const typeColors = {
    info: '#00ffff',
    success: '#00ff41',
    warning: '#ffd700',
    error: '#ff0040',
    system: '#ff00ff',
  }

  return (
    <div
      ref={containerRef}
      className={`font-mono text-xs overflow-y-auto bg-black/80 border border-fuchsia-500/30 rounded-lg p-4 ${className}`}
      style={{ maxHeight: '200px' }}
    >
      {logs.map((log, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * (speed / 1000) }}
          className="flex gap-2 mb-1"
        >
          <span className="text-neutral-600">{log.timestamp || new Date().toLocaleTimeString()}</span>
          <span style={{ color: typeColors[log.type] }}>[{log.type.toUpperCase()}]</span>
          <span className="text-neutral-300">{log.text}</span>
        </motion.div>
      ))}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="text-fuchsia-400"
      >
        █
      </motion.span>
    </div>
  )
}

// ============================================
// ROTATING 3D WIREFRAME
// ============================================
export function WireframeLogo({
  size = 200,
  color = '#ff00ff',
  rotationSpeed = 10
}: {
  size?: number
  color?: string
  rotationSpeed?: number
}) {
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{ rotateY: 360, rotateX: [0, 15, 0, -15, 0] }}
      transition={{
        rotateY: { duration: rotationSpeed, repeat: Infinity, ease: 'linear' },
        rotateX: { duration: rotationSpeed * 2, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {/* Outer hexagon */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <motion.polygon
          points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
          animate={{ strokeDashoffset: [0, 200] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          strokeDasharray="10 5"
        />
      </svg>

      {/* Inner triangle */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <motion.polygon
          points="50,20 80,70 20,70"
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          animate={{ scale: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </svg>

      {/* Center point */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  )
}

// ============================================
// BREACH TUNNEL EFFECT
// ============================================
export function BreachTunnel({
  active = false,
  color = '#ff00ff'
}: {
  active?: boolean
  color?: string
}) {
  return (
    <motion.div
      className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute border rounded-full"
          style={{
            width: `${(i + 1) * 15}%`,
            height: `${(i + 1) * 15}%`,
            borderColor: color,
            opacity: 0.3 - i * 0.02,
          }}
          animate={active ? {
            scale: [1, 1.5],
            opacity: [0.3 - i * 0.02, 0],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'linear',
          }}
        />
      ))}

      {/* Central glow */}
      <motion.div
        className="absolute w-4 h-4 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 60px ${color}, 0 0 120px ${color}`,
        }}
        animate={active ? { scale: [1, 2, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  )
}

// ============================================
// NEON VORTEX TRANSITION
// ============================================
export function NeonVortex({
  active = false,
  onComplete,
  color = '#ff00ff'
}: {
  active?: boolean
  onComplete?: () => void
  color?: string
}) {
  useEffect(() => {
    if (active && onComplete) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [active, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
    >
      {/* Spiral lines */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 w-[200vw] h-1"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            transformOrigin: 'center',
          }}
          initial={{
            rotate: i * 30,
            scale: 0,
            x: '-50%',
            y: '-50%',
          }}
          animate={active ? {
            scale: [0, 1, 0],
            rotate: [i * 30, i * 30 + 360],
          } : {}}
          transition={{
            duration: 2,
            delay: i * 0.05,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Central collapse */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ scale: 0, borderRadius: '50%' }}
        animate={active ? {
          scale: [0, 3],
          opacity: [0, 1],
        } : {}}
        transition={{ duration: 1.5, delay: 0.5 }}
        style={{ transformOrigin: 'center' }}
      />
    </motion.div>
  )
}

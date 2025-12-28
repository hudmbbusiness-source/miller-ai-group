'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================
// PARTICLE SYSTEM ENGINE
// Professional-grade particle effects
// ============================================

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
  type: 'dot' | 'line' | 'glyph' | 'spark' | 'data'
  rotation?: number
  rotationSpeed?: number
  glyph?: string
}

interface ParticleSystemConfig {
  maxParticles: number
  emitRate: number
  gravity: number
  wind: number
  colors: string[]
  types: Particle['type'][]
}

const GLYPHS = '01アイウエオカキクケコサシスセソタチツテト$¥€£₿∑∆∏∫∂√∞≈≠≤≥■□▪▫●○◆◇★☆'.split('')

export function useParticleSystem(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  config: Partial<ParticleSystemConfig> = {}
) {
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef(0)

  const fullConfig: ParticleSystemConfig = {
    maxParticles: config.maxParticles ?? 200,
    emitRate: config.emitRate ?? 3,
    gravity: config.gravity ?? 0.02,
    wind: config.wind ?? 0,
    colors: config.colors ?? ['#ff00ff', '#00ffff', '#ff0040', '#00ff41'],
    types: config.types ?? ['dot', 'glyph', 'data'],
  }

  const emit = useCallback((x: number, y: number, count: number = 1, options: Partial<Particle> = {}) => {
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= fullConfig.maxParticles) break

      const type = options.type ?? fullConfig.types[Math.floor(Math.random() * fullConfig.types.length)]
      const color = options.color ?? fullConfig.colors[Math.floor(Math.random() * fullConfig.colors.length)]

      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: options.vx ?? (Math.random() - 0.5) * 4,
        vy: options.vy ?? (Math.random() - 0.5) * 4 - 2,
        life: 1,
        maxLife: options.maxLife ?? Math.random() * 2 + 1,
        size: options.size ?? Math.random() * 4 + 2,
        color,
        alpha: 1,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      })
    }
  }, [fullConfig])

  const update = useCallback((ctx: CanvasRenderingContext2D, deltaTime: number) => {
    particlesRef.current = particlesRef.current.filter(p => {
      // Update position
      p.x += p.vx
      p.y += p.vy
      p.vy += fullConfig.gravity
      p.vx += fullConfig.wind

      // Update life
      p.life -= deltaTime / p.maxLife
      p.alpha = Math.max(0, p.life)

      // Update rotation
      if (p.rotation !== undefined && p.rotationSpeed) {
        p.rotation += p.rotationSpeed
      }

      // Draw particle
      if (p.life > 0) {
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.strokeStyle = p.color

        switch (p.type) {
          case 'dot':
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
            break

          case 'line':
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5)
            ctx.stroke()
            break

          case 'spark':
            ctx.lineWidth = 2
            ctx.shadowBlur = 10
            ctx.shadowColor = p.color
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p.x - p.vx * 8, p.y - p.vy * 8)
            ctx.stroke()
            ctx.shadowBlur = 0
            break

          case 'glyph':
          case 'data':
            ctx.font = `${p.size * 3}px monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            if (p.rotation !== undefined) {
              ctx.translate(p.x, p.y)
              ctx.rotate(p.rotation)
              ctx.fillText(p.glyph || '0', 0, 0)
            } else {
              ctx.fillText(p.glyph || '0', p.x, p.y)
            }
            break
        }

        ctx.restore()
        return true
      }
      return false
    })
  }, [fullConfig])

  return { emit, update, particles: particlesRef }
}

// ============================================
// ADVANCED GLITCH SYSTEM
// Multi-layer corruption effects
// ============================================

interface GlitchLayer {
  type: 'rgb-split' | 'scanlines' | 'noise' | 'displacement' | 'corruption' | 'vhs' | 'tear'
  intensity: number
  speed: number
}

interface GlitchConfig {
  layers: GlitchLayer[]
  globalIntensity: number
}

export function GlitchCanvas({
  intensity = 1,
  layers = ['rgb-split', 'scanlines', 'noise', 'displacement', 'vhs'],
  className = '',
  children
}: {
  intensity?: number
  layers?: GlitchLayer['type'][]
  className?: string
  children?: React.ReactNode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = container.offsetWidth
      canvas.height = container.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      frameRef.current++
      const frame = frameRef.current
      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)

      // Scanlines
      if (layers.includes('scanlines')) {
        for (let y = 0; y < h; y += 2) {
          ctx.fillStyle = `rgba(0,0,0,${0.1 * intensity})`
          ctx.fillRect(0, y, w, 1)
        }
      }

      // RGB Split
      if (layers.includes('rgb-split') && Math.random() > 0.95) {
        const offset = (Math.random() * 10 + 5) * intensity
        ctx.fillStyle = `rgba(255,0,0,${0.1 * intensity})`
        ctx.fillRect(-offset, 0, w, h)
        ctx.fillStyle = `rgba(0,255,255,${0.1 * intensity})`
        ctx.fillRect(offset, 0, w, h)
      }

      // Noise
      if (layers.includes('noise')) {
        const imageData = ctx.getImageData(0, 0, w, h)
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (Math.random() > 0.99) {
            const noise = Math.random() * 255
            imageData.data[i] = noise
            imageData.data[i + 1] = noise
            imageData.data[i + 2] = noise
            imageData.data[i + 3] = 30 * intensity
          }
        }
        ctx.putImageData(imageData, 0, 0)
      }

      // Displacement / Tear
      if (layers.includes('displacement') || layers.includes('tear')) {
        if (Math.random() > 0.9) {
          const tearY = Math.random() * h
          const tearH = Math.random() * 30 + 10
          const offset = (Math.random() - 0.5) * 50 * intensity

          ctx.fillStyle = `rgba(255,0,255,${0.3 * intensity})`
          ctx.fillRect(offset, tearY, w, tearH)
        }
      }

      // VHS tracking
      if (layers.includes('vhs')) {
        const trackingY = (frame * 2) % (h + 100) - 50
        ctx.fillStyle = `rgba(255,255,255,${0.05 * intensity})`
        ctx.fillRect(0, trackingY, w, 20)
      }

      // Block corruption
      if (layers.includes('corruption') && Math.random() > 0.95) {
        for (let i = 0; i < 3; i++) {
          const bx = Math.random() * w
          const by = Math.random() * h
          const bw = Math.random() * 100 + 50
          const bh = Math.random() * 20 + 5
          ctx.fillStyle = Math.random() > 0.5 ? '#ff00ff' : '#00ffff'
          ctx.globalAlpha = 0.3 * intensity
          ctx.fillRect(bx, by, bw, bh)
          ctx.globalAlpha = 1
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [intensity, layers])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-50"
      />
    </div>
  )
}

// ============================================
// 3D PERSPECTIVE GRID (Watch Dogs Style)
// ============================================

export function PerspectiveGrid({
  color = '#ff00ff',
  speed = 1,
  density = 20,
  className = ''
}: {
  color?: string
  speed?: number
  density?: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const animationRef = useRef<number | undefined>(undefined)

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

    const animate = () => {
      frameRef.current += 0.01 * speed
      const frame = frameRef.current
      const w = canvas.width
      const h = canvas.height

      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.fillRect(0, 0, w, h)

      // Vanishing point
      const vpX = w / 2
      const vpY = h * 0.35

      // Draw horizontal lines with perspective
      ctx.strokeStyle = color
      ctx.lineWidth = 1

      for (let i = 0; i < density; i++) {
        const baseY = vpY + (i / density) * (h - vpY)
        const perspective = (baseY - vpY) / (h - vpY)
        const offsetY = (frame * 50 * perspective) % (h / density)

        const y = baseY + offsetY
        if (y > vpY && y < h) {
          ctx.globalAlpha = perspective * 0.5
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }
      }

      // Draw vertical lines converging to vanishing point
      const numVertical = 30
      for (let i = 0; i <= numVertical; i++) {
        const x = (i / numVertical) * w
        ctx.globalAlpha = 0.3

        ctx.beginPath()
        ctx.moveTo(vpX, vpY)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      // Horizon glow
      const gradient = ctx.createLinearGradient(0, vpY - 50, 0, vpY + 100)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.5, color + '40')
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.globalAlpha = 0.5
      ctx.fillRect(0, vpY - 50, w, 150)

      ctx.globalAlpha = 1
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [color, speed, density])

  return <canvas ref={canvasRef} className={`fixed inset-0 ${className}`} />
}

// ============================================
// DATA STREAM RAIN (Matrix Style)
// ============================================

interface DataColumn {
  x: number
  y: number
  speed: number
  chars: string[]
  length: number
  opacity: number
}

export function DataStreamRain({
  color = '#00ff41',
  density = 1,
  speed = 1,
  className = ''
}: {
  color?: string
  density?: number
  speed?: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const columnsRef = useRef<DataColumn[]>([])
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // Initialize columns
      const columnWidth = 20
      const numColumns = Math.floor(canvas.width / columnWidth) * density
      columnsRef.current = []

      for (let i = 0; i < numColumns; i++) {
        columnsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          speed: (Math.random() * 3 + 2) * speed,
          chars: Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]),
          length: Math.floor(Math.random() * 15) + 10,
          opacity: Math.random() * 0.5 + 0.3
        })
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = '14px monospace'

      columnsRef.current.forEach(col => {
        col.y += col.speed

        for (let i = 0; i < col.length; i++) {
          const charY = col.y - i * 18
          if (charY < 0 || charY > canvas.height) continue

          const alpha = ((col.length - i) / col.length) * col.opacity
          ctx.fillStyle = color
          ctx.globalAlpha = alpha

          // Leading character glow
          if (i === 0) {
            ctx.shadowBlur = 20
            ctx.shadowColor = color
            ctx.fillStyle = '#ffffff'
          }

          ctx.fillText(col.chars[i % col.chars.length], col.x, charY)
          ctx.shadowBlur = 0
          ctx.fillStyle = color
        }

        // Reset when off screen
        if (col.y - col.length * 18 > canvas.height) {
          col.y = -col.length * 18
          col.x = Math.random() * canvas.width
          col.chars = Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)])
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
  }, [color, density, speed])

  return <canvas ref={canvasRef} className={`fixed inset-0 ${className}`} />
}

// ============================================
// SCREEN SHAKE EFFECT
// ============================================

export function ScreenShake({
  active,
  intensity = 1,
  children
}: {
  active: boolean
  intensity?: number
  children: React.ReactNode
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!active) {
      setOffset({ x: 0, y: 0 })
      return
    }

    const interval = setInterval(() => {
      setOffset({
        x: (Math.random() - 0.5) * 10 * intensity,
        y: (Math.random() - 0.5) * 10 * intensity
      })
    }, 50)

    return () => clearInterval(interval)
  }, [active, intensity])

  return (
    <motion.div
      animate={{ x: offset.x, y: offset.y }}
      transition={{ duration: 0.05 }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// CHROMATIC ABERRATION TEXT
// ============================================

export function ChromaticText({
  children,
  intensity = 1,
  className = ''
}: {
  children: string
  intensity?: number
  className?: string
}) {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Red layer */}
      <span
        className="absolute top-0 left-0 opacity-70"
        style={{
          color: '#ff0000',
          transform: `translateX(${-2 * intensity}px)`,
          mixBlendMode: 'screen'
        }}
      >
        {children}
      </span>
      {/* Cyan layer */}
      <span
        className="absolute top-0 left-0 opacity-70"
        style={{
          color: '#00ffff',
          transform: `translateX(${2 * intensity}px)`,
          mixBlendMode: 'screen'
        }}
      >
        {children}
      </span>
      {/* Main text */}
      <span className="relative z-10">{children}</span>
    </span>
  )
}

// ============================================
// TYPING EFFECT WITH GLITCHES
// ============================================

export function GlitchTyper({
  text,
  speed = 50,
  glitchProbability = 0.1,
  onComplete,
  className = ''
}: {
  text: string
  speed?: number
  glitchProbability?: number
  onComplete?: () => void
  className?: string
}) {
  const [displayed, setDisplayed] = useState('')
  const [isGlitching, setIsGlitching] = useState(false)
  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`░▒▓█'

  useEffect(() => {
    let i = 0
    setDisplayed('')

    const interval = setInterval(() => {
      if (i < text.length) {
        // Random glitch
        if (Math.random() < glitchProbability) {
          setIsGlitching(true)
          setDisplayed(text.slice(0, i) + glitchChars[Math.floor(Math.random() * glitchChars.length)])
          setTimeout(() => {
            setIsGlitching(false)
            setDisplayed(text.slice(0, i + 1))
          }, 50)
        } else {
          setDisplayed(text.slice(0, i + 1))
        }
        i++
      } else {
        clearInterval(interval)
        onComplete?.()
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed, glitchProbability, onComplete])

  return (
    <span className={className}>
      {displayed}
      <motion.span
        className="inline-block w-2 h-5 bg-current ml-1"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    </span>
  )
}

// ============================================
// HUD CORNER BRACKETS
// ============================================

export function HUDBrackets({
  color = '#ff00ff',
  size = 40,
  thickness = 2,
  animated = true,
  className = ''
}: {
  color?: string
  size?: number
  thickness?: number
  animated?: boolean
  className?: string
}) {
  const bracketStyle = {
    borderColor: color,
    borderWidth: thickness
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Top Left */}
      <motion.div
        className="absolute top-4 left-4 border-t border-l"
        style={{ ...bracketStyle, width: size, height: size }}
        animate={animated ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* Top Right */}
      <motion.div
        className="absolute top-4 right-4 border-t border-r"
        style={{ ...bracketStyle, width: size, height: size }}
        animate={animated ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
      {/* Bottom Left */}
      <motion.div
        className="absolute bottom-4 left-4 border-b border-l"
        style={{ ...bracketStyle, width: size, height: size }}
        animate={animated ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      />
      {/* Bottom Right */}
      <motion.div
        className="absolute bottom-4 right-4 border-b border-r"
        style={{ ...bracketStyle, width: size, height: size }}
        animate={animated ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
      />
    </div>
  )
}

// ============================================
// SCAN LINE OVERLAY
// ============================================

export function ScanLineOverlay({
  speed = 3,
  color = '#00ffff',
  className = ''
}: {
  speed?: number
  color?: string
  className?: string
}) {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Static scanlines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
        }}
      />
      {/* Moving scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`
        }}
        animate={{ top: ['-5%', '105%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// ============================================
// FLICKER EFFECT
// ============================================

export function Flicker({
  children,
  intensity = 1,
  speed = 'medium'
}: {
  children: React.ReactNode
  intensity?: number
  speed?: 'slow' | 'medium' | 'fast'
}) {
  const speedMap = {
    slow: { duration: 0.2, delay: 3 },
    medium: { duration: 0.1, delay: 1.5 },
    fast: { duration: 0.05, delay: 0.5 }
  }

  const config = speedMap[speed]

  return (
    <motion.div
      animate={{
        opacity: [1, 1 - (0.3 * intensity), 1, 1 - (0.5 * intensity), 1],
      }}
      transition={{
        duration: config.duration,
        repeat: Infinity,
        repeatDelay: config.delay + Math.random() * config.delay
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// PROGRESS BAR WITH GLITCH
// ============================================

export function GlitchProgressBar({
  progress,
  color = '#ff00ff',
  height = 4,
  showPercentage = true,
  label = '',
  className = ''
}: {
  progress: number
  color?: string
  height?: number
  showPercentage?: boolean
  label?: string
  className?: string
}) {
  const [glitchOffset, setGlitchOffset] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.9) {
        setGlitchOffset((Math.random() - 0.5) * 10)
        setTimeout(() => setGlitchOffset(0), 50)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1 font-mono text-xs">
          <span style={{ color }}>{label}</span>
          {showPercentage && (
            <span style={{ color }}>{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div
        className="relative overflow-hidden rounded"
        style={{ height, background: 'rgba(255,255,255,0.1)' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded"
          style={{
            background: color,
            boxShadow: `0 0 10px ${color}`,
            width: `${progress}%`,
            transform: `translateX(${glitchOffset}px)`
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
        {/* Glow effect at the edge */}
        <motion.div
          className="absolute inset-y-0 w-4"
          style={{
            left: `${progress}%`,
            background: `linear-gradient(90deg, ${color}, transparent)`,
            filter: 'blur(4px)'
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>
    </div>
  )
}

// ============================================
// HEXAGON LOADER
// ============================================

export function HexagonLoader({
  size = 60,
  color = '#ff00ff',
  className = ''
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0"
          style={{
            border: `2px solid ${color}`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          }}
          animate={{
            rotate: 360,
            scale: [1, 0.8, 1]
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1.5, repeat: Infinity, delay: i * 0.2 }
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// ALERT BOX
// ============================================

export function AlertBox({
  type = 'warning',
  title,
  message,
  onDismiss,
  autoDismiss = 3000
}: {
  type?: 'warning' | 'error' | 'success' | 'info' | 'breach'
  title: string
  message: string
  onDismiss?: () => void
  autoDismiss?: number
}) {
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismiss)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, onDismiss])

  const colors = {
    warning: { bg: '#ffd70020', border: '#ffd700', icon: '⚠' },
    error: { bg: '#ff004020', border: '#ff0040', icon: '✕' },
    success: { bg: '#00ff4120', border: '#00ff41', icon: '✓' },
    info: { bg: '#00ffff20', border: '#00ffff', icon: 'ℹ' },
    breach: { bg: '#ff00ff20', border: '#ff00ff', icon: '☠' }
  }

  const config = colors[type]

  return (
    <motion.div
      className="rounded-lg p-4 backdrop-blur-sm font-mono"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: `0 0 20px ${config.border}40`
      }}
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
    >
      <div className="flex items-start gap-3">
        <motion.span
          className="text-xl"
          style={{ color: config.border }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {config.icon}
        </motion.span>
        <div>
          <h4 className="font-bold text-sm" style={{ color: config.border }}>
            {title}
          </h4>
          <p className="text-xs text-neutral-400 mt-1">{message}</p>
        </div>
      </div>
    </motion.div>
  )
}

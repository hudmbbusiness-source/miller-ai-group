'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

// ============================================
// TYPES
// ============================================
interface CinematicTakeoverProps {
  onComplete: () => void
  userName?: string
}

interface TerminalLine {
  text: string
  type: 'command' | 'output' | 'error' | 'success' | 'warning'
  delay?: number
}

interface SystemAlert {
  id: string
  type: 'warning' | 'error' | 'success' | 'breach'
  title: string
  message: string
  x: number
  y: number
}

// ============================================
// CHARACTER DATA WITH REAL IMAGES
// ============================================
const CHARACTERS = [
  {
    id: 'wick',
    name: 'JOHN WICK',
    subtitle: 'THE BOOGEYMAN',
    quote: 'People keep asking if I\'m back...',
    color: '#ff0040',
    image: '/characters/wick.png', // We'll use a placeholder approach
    role: 'SECURITY ELIMINATION'
  },
  {
    id: 'bart',
    name: 'BART SIMPSON',
    subtitle: 'CHAOS AGENT',
    quote: 'Eat my shorts, firewall.',
    color: '#ffd700',
    image: '/characters/bart.png',
    role: 'SYSTEM DISRUPTION'
  },
  {
    id: 'joker',
    name: 'THE JOKER',
    subtitle: 'AGENT OF CHAOS',
    quote: 'Why so serious about security?',
    color: '#9d00ff',
    image: '/characters/joker.png',
    role: 'PSYCHOLOGICAL WARFARE'
  },
  {
    id: 'wolf',
    name: 'JORDAN BELFORT',
    subtitle: 'THE WOLF',
    quote: 'I\'m not leaving. I\'m not f***ing leaving!',
    color: '#00ff41',
    image: '/characters/wolf.png',
    role: 'FINANCIAL EXTRACTION'
  },
  {
    id: 'margot',
    name: 'NAOMI LAPAGLIA',
    subtitle: 'THE DUCHESS',
    quote: 'Let me explain this simply...',
    color: '#ff1493',
    image: '/characters/margot.png',
    role: 'SOCIAL ENGINEERING'
  },
]

// ============================================
// TERMINAL SEQUENCES
// ============================================
const TERMINAL_SEQUENCES: Record<string, TerminalLine[]> = {
  init: [
    { text: '$ initiating_breach_protocol --force', type: 'command' },
    { text: 'Connecting to target: 192.168.1.1...', type: 'output' },
    { text: 'Connection established.', type: 'success' },
    { text: '$ nmap -sV -sC target_system', type: 'command' },
    { text: 'Scanning ports... 22/tcp open ssh', type: 'output' },
    { text: '443/tcp open https', type: 'output' },
    { text: '3306/tcp open mysql', type: 'output' },
    { text: '$ exploit --payload=miller_rootkit', type: 'command' },
    { text: '[!] Firewall detected...', type: 'warning' },
    { text: '[+] Bypassing firewall...', type: 'output' },
    { text: '[+] FIREWALL BYPASSED', type: 'success' },
  ],
  breach: [
    { text: '$ sudo access_mainframe --elevated', type: 'command' },
    { text: 'Requesting elevated privileges...', type: 'output' },
    { text: '[!] ACCESS DENIED', type: 'error' },
    { text: '$ inject_payload --stealth', type: 'command' },
    { text: 'Injecting Miller AI rootkit...', type: 'output' },
    { text: '████████████████████ 100%', type: 'output' },
    { text: '[+] Rootkit deployed successfully', type: 'success' },
    { text: '$ escalate_privileges --root', type: 'command' },
    { text: '[+] ROOT ACCESS GRANTED', type: 'success' },
  ],
  extraction: [
    { text: '$ dump_credentials --all', type: 'command' },
    { text: 'Extracting user credentials...', type: 'output' },
    { text: 'Found: 847 credential pairs', type: 'success' },
    { text: '$ exfiltrate_data --encrypt', type: 'command' },
    { text: 'Encrypting extracted data...', type: 'output' },
    { text: 'Uploading to Miller AI servers...', type: 'output' },
    { text: '[+] DATA EXFILTRATION COMPLETE', type: 'success' },
    { text: '$ install_backdoor --persistent', type: 'command' },
    { text: '[+] BACKDOOR INSTALLED', type: 'success' },
    { text: '[+] SYSTEM COMPROMISED', type: 'success' },
  ],
  final: [
    { text: '$ miller_ai --takeover --complete', type: 'command' },
    { text: '', type: 'output' },
    { text: '███╗   ███╗██╗██╗     ██╗     ███████╗██████╗ ', type: 'success' },
    { text: '████╗ ████║██║██║     ██║     ██╔════╝██╔══██╗', type: 'success' },
    { text: '██╔████╔██║██║██║     ██║     █████╗  ██████╔╝', type: 'success' },
    { text: '██║╚██╔╝██║██║██║     ██║     ██╔══╝  ██╔══██╗', type: 'success' },
    { text: '██║ ╚═╝ ██║██║███████╗███████╗███████╗██║  ██║', type: 'success' },
    { text: '╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝', type: 'success' },
    { text: '', type: 'output' },
    { text: '[+] WELCOME TO MILLER AI GROUP OS', type: 'success' },
    { text: '[+] You are now part of the system.', type: 'success' },
  ]
}

// ============================================
// GLITCH TEXT COMPONENT
// ============================================
function GlitchText({
  children,
  className = '',
  intensity = 1
}: {
  children: string
  className?: string
  intensity?: number
}) {
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 100 * intensity)
    }, 2000 / intensity)
    return () => clearInterval(interval)
  }, [intensity])

  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      {glitchActive && (
        <>
          <span
            className="absolute top-0 left-0 z-20 opacity-80"
            style={{
              color: '#ff0000',
              transform: `translate(${Math.random() * 4 - 2}px, ${Math.random() * 2 - 1}px)`,
              clipPath: 'inset(0 0 50% 0)'
            }}
          >
            {children}
          </span>
          <span
            className="absolute top-0 left-0 z-20 opacity-80"
            style={{
              color: '#00ffff',
              transform: `translate(${Math.random() * -4 + 2}px, ${Math.random() * 2 - 1}px)`,
              clipPath: 'inset(50% 0 0 0)'
            }}
          >
            {children}
          </span>
        </>
      )}
    </span>
  )
}

// ============================================
// TERMINAL WINDOW COMPONENT
// ============================================
function TerminalWindow({
  title = 'root@miller-ai:~#',
  lines,
  x = 0,
  y = 0,
  width = 500,
  onComplete,
  speed = 50,
  minimized = false
}: {
  title?: string
  lines: TerminalLine[]
  x?: number
  y?: number
  width?: number
  onComplete?: () => void
  speed?: number
  minimized?: boolean
}) {
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([])
  const [currentLine, setCurrentLine] = useState(0)
  const [currentChar, setCurrentChar] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentLine >= lines.length) {
      onComplete?.()
      return
    }

    const line = lines[currentLine]

    if (currentChar < line.text.length) {
      const timer = setTimeout(() => {
        setCurrentChar(c => c + 1)
      }, line.type === 'command' ? speed : speed / 3)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => {
        setVisibleLines(prev => [...prev, { ...line, text: line.text }])
        setCurrentLine(l => l + 1)
        setCurrentChar(0)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentLine, currentChar, lines, onComplete, speed])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [visibleLines, currentChar])

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command': return '#00ff41'
      case 'success': return '#00ff41'
      case 'error': return '#ff0040'
      case 'warning': return '#ffd700'
      default: return '#ffffff'
    }
  }

  if (minimized) return null

  return (
    <motion.div
      className="absolute rounded-lg overflow-hidden shadow-2xl"
      style={{
        left: x,
        top: y,
        width,
        background: 'rgba(0,0,0,0.95)',
        border: '1px solid rgba(0,255,65,0.3)',
        boxShadow: '0 0 30px rgba(0,255,65,0.2), inset 0 0 60px rgba(0,0,0,0.5)'
      }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {/* Title bar */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ background: 'rgba(0,255,65,0.1)', borderBottom: '1px solid rgba(0,255,65,0.2)' }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs font-mono text-green-400 ml-2">{title}</span>
      </div>

      {/* Terminal content */}
      <div
        ref={containerRef}
        className="p-3 font-mono text-xs overflow-y-auto"
        style={{ height: 200, background: 'rgba(0,10,0,0.8)' }}
      >
        {visibleLines.map((line, i) => (
          <div key={i} style={{ color: getLineColor(line.type) }} className="leading-relaxed">
            {line.text}
          </div>
        ))}
        {currentLine < lines.length && (
          <div style={{ color: getLineColor(lines[currentLine].type) }}>
            {lines[currentLine].text.substring(0, currentChar)}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              █
            </motion.span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// SYSTEM ALERT COMPONENT
// ============================================
function SystemAlertPopup({ alert, onDismiss }: { alert: SystemAlert; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const colors = {
    warning: { bg: 'rgba(255,215,0,0.1)', border: '#ffd700', text: '#ffd700' },
    error: { bg: 'rgba(255,0,64,0.1)', border: '#ff0040', text: '#ff0040' },
    success: { bg: 'rgba(0,255,65,0.1)', border: '#00ff41', text: '#00ff41' },
    breach: { bg: 'rgba(255,0,255,0.1)', border: '#ff00ff', text: '#ff00ff' },
  }

  const c = colors[alert.type]

  return (
    <motion.div
      className="absolute z-50 rounded-lg p-4 backdrop-blur-sm"
      style={{
        left: alert.x,
        top: alert.y,
        background: c.bg,
        border: `2px solid ${c.border}`,
        boxShadow: `0 0 30px ${c.border}50`,
        minWidth: 300,
      }}
      initial={{ opacity: 0, scale: 0.5, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -20 }}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="text-2xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {alert.type === 'warning' && '⚠️'}
          {alert.type === 'error' && '🚫'}
          {alert.type === 'success' && '✅'}
          {alert.type === 'breach' && '💀'}
        </motion.div>
        <div>
          <h4 className="font-mono font-bold text-sm" style={{ color: c.text }}>
            {alert.title}
          </h4>
          <p className="font-mono text-xs text-neutral-400 mt-1">
            {alert.message}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// ANIMATED CHARACTER SILHOUETTE - Watch Dogs Style
// ============================================
function AnimatedCharacterSilhouette({
  character,
  size = 280
}: {
  character: typeof CHARACTERS[0]
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size
    canvas.height = size

    // Parse hex color to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 0, b: 255 }
    }

    const rgb = hexToRgb(character.color)
    const centerX = size / 2
    const centerY = size / 2

    // Animated silhouette particles
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      alpha: number
      life: number
    }> = []

    // Head and body outline points for character shape
    const createBodyPoints = (time: number) => {
      const breathing = Math.sin(time * 2) * 3
      const sway = Math.sin(time * 0.5) * 5

      return {
        // Head
        head: { x: centerX + sway, y: centerY - 60 + breathing, radius: 45 },
        // Shoulders
        leftShoulder: { x: centerX - 55 + sway * 0.5, y: centerY + 10 + breathing * 0.5 },
        rightShoulder: { x: centerX + 55 + sway * 0.5, y: centerY + 10 + breathing * 0.5 },
        // Torso
        torsoWidth: 80 + breathing * 0.3,
      }
    }

    const animate = () => {
      frameRef.current += 0.016
      const time = frameRef.current

      // Clear with trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(0, 0, size, size)

      const body = createBodyPoints(time)

      // Draw glitch effect layers
      for (let layer = 0; layer < 3; layer++) {
        const glitchOffset = Math.random() > 0.95 ? (Math.random() - 0.5) * 10 : 0
        const layerAlpha = layer === 1 ? 0.8 : 0.3

        ctx.save()
        ctx.translate(glitchOffset * (layer - 1), 0)

        // Draw head glow
        const gradient = ctx.createRadialGradient(
          body.head.x, body.head.y, 0,
          body.head.x, body.head.y, body.head.radius * 1.5
        )
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.6 * layerAlpha})`)
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.2 * layerAlpha})`)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(body.head.x, body.head.y, body.head.radius, 0, Math.PI * 2)
        ctx.fill()

        // Draw head outline
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${layerAlpha})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(body.head.x, body.head.y, body.head.radius, 0, Math.PI * 2)
        ctx.stroke()

        // Draw body/shoulders
        ctx.beginPath()
        ctx.moveTo(body.head.x, body.head.y + body.head.radius - 5)
        ctx.lineTo(body.leftShoulder.x, body.leftShoulder.y)
        ctx.lineTo(body.leftShoulder.x - 10, size)
        ctx.lineTo(body.rightShoulder.x + 10, size)
        ctx.lineTo(body.rightShoulder.x, body.rightShoulder.y)
        ctx.lineTo(body.head.x, body.head.y + body.head.radius - 5)
        ctx.closePath()

        const bodyGradient = ctx.createLinearGradient(centerX, body.head.y + body.head.radius, centerX, size)
        bodyGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 * layerAlpha})`)
        bodyGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.1 * layerAlpha})`)
        ctx.fillStyle = bodyGradient
        ctx.fill()
        ctx.stroke()

        // Draw eyes (menacing glow)
        const eyeY = body.head.y - 5
        const eyeGlow = 0.5 + Math.sin(time * 3) * 0.3

        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${eyeGlow})`
        ctx.shadowBlur = 20
        ctx.shadowColor = character.color
        ctx.beginPath()
        ctx.ellipse(body.head.x - 15, eyeY, 8, 4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(body.head.x + 15, eyeY, 8, 4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.restore()
      }

      // Add scan lines
      for (let y = 0; y < size; y += 4) {
        if (Math.random() > 0.97) {
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
          ctx.fillRect(0, y, size, 2)
        }
      }

      // Horizontal glitch bars
      if (Math.random() > 0.93) {
        const glitchY = Math.random() * size
        const glitchHeight = Math.random() * 20 + 5
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
        ctx.fillRect(0, glitchY, size, glitchHeight)
      }

      // Add floating data particles around character
      if (particles.length < 30 && Math.random() > 0.9) {
        particles.push({
          x: Math.random() * size,
          y: size + 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 3 - 1,
          size: Math.random() * 3 + 1,
          alpha: 1,
          life: 1
        })
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.01
        p.alpha = p.life

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha})`
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [character.color, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="relative z-10"
    />
  )
}

// ============================================
// CHARACTER REVEAL COMPONENT - Watch Dogs Style
// ============================================
function CharacterReveal({
  character,
  onComplete
}: {
  character: typeof CHARACTERS[0]
  onComplete: () => void
}) {
  const [showStats, setShowStats] = useState(false)
  const [glitchBurst, setGlitchBurst] = useState(false)

  useEffect(() => {
    const timer = setTimeout(onComplete, 5000)
    const statsTimer = setTimeout(() => setShowStats(true), 800)
    const glitchTimer = setInterval(() => {
      setGlitchBurst(true)
      setTimeout(() => setGlitchBurst(false), 100)
    }, 2000)

    return () => {
      clearTimeout(timer)
      clearTimeout(statsTimer)
      clearInterval(glitchTimer)
    }
  }, [onComplete])

  // Random threat level and stats
  const threatLevel = Math.floor(Math.random() * 30) + 70
  const stats = {
    'THREAT': `${threatLevel}%`,
    'SKILL': ['S', 'A', 'B'][Math.floor(Math.random() * 2)],
    'STATUS': 'ACTIVE',
    'CLEARANCE': 'OMEGA'
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Intense background */}
      <div className="absolute inset-0 bg-black" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(${character.color}20 1px, transparent 1px),
            linear-gradient(90deg, ${character.color}20 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Diagonal scan lines */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            ${character.color}10 2px,
            ${character.color}10 4px
          )`,
        }}
        animate={{ backgroundPosition: ['0 0', '100px 100px'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />

      {/* Moving scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[3px] z-30"
        style={{
          background: `linear-gradient(90deg, transparent, ${character.color}, transparent)`,
          boxShadow: `0 0 30px ${character.color}, 0 0 60px ${character.color}`,
        }}
        animate={{ top: ['-5%', '105%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />

      {/* Chromatic aberration burst on glitch */}
      <AnimatePresence>
        {glitchBurst && (
          <>
            <motion.div
              className="absolute inset-0 z-50 pointer-events-none"
              style={{ background: 'rgba(255,0,0,0.1)', transform: 'translateX(-5px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="absolute inset-0 z-50 pointer-events-none"
              style={{ background: 'rgba(0,255,255,0.1)', transform: 'translateX(5px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main content - flex layout */}
      <div className="relative z-10 flex items-center gap-16 px-8">
        {/* Animated character silhouette */}
        <motion.div
          className="relative"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
        >
          {/* Glow backdrop */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${character.color}60 0%, transparent 70%)`,
              filter: 'blur(40px)',
              transform: 'scale(1.5)',
            }}
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1.4, 1.6, 1.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Character silhouette canvas */}
          <AnimatedCharacterSilhouette character={character} size={300} />

          {/* Corner brackets */}
          <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: character.color }} />
          <div className="absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: character.color }} />
          <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: character.color }} />
          <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: character.color }} />
        </motion.div>

        {/* Character info panel */}
        <motion.div
          className="flex flex-col gap-4"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
        >
          {/* Codename */}
          <div>
            <motion.p
              className="text-xs font-mono tracking-[0.3em] mb-1"
              style={{ color: `${character.color}99` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              OPERATIVE IDENTIFIED
            </motion.p>
            <motion.h2
              className="text-6xl font-bold font-mono"
              style={{
                color: character.color,
                textShadow: `0 0 30px ${character.color}, 0 0 60px ${character.color}50`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlitchText intensity={glitchBurst ? 5 : 1}>{character.name}</GlitchText>
            </motion.h2>
            <motion.p
              className="text-xl font-mono tracking-[0.2em] mt-2"
              style={{ color: `${character.color}cc` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              "{character.subtitle}"
            </motion.p>
          </div>

          {/* Quote */}
          <motion.div
            className="max-w-md border-l-2 pl-4 py-2"
            style={{ borderColor: `${character.color}50` }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-lg font-mono italic text-white/80">
              "{character.quote}"
            </p>
          </motion.div>

          {/* Stats panel */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                className="grid grid-cols-2 gap-3 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {Object.entries(stats).map(([key, value], i) => (
                  <motion.div
                    key={key}
                    className="px-4 py-2 rounded border font-mono text-sm"
                    style={{
                      borderColor: `${character.color}40`,
                      background: `${character.color}10`,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    <span className="text-neutral-500 text-xs">{key}</span>
                    <p style={{ color: character.color }}>{value}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Role badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 rounded border font-mono text-sm tracking-wider mt-4"
            style={{
              borderColor: character.color,
              color: character.color,
              background: `${character.color}15`,
              boxShadow: `0 0 30px ${character.color}30, inset 0 0 30px ${character.color}10`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: character.color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            {character.role}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom status bar */}
      <motion.div
        className="absolute bottom-8 left-8 right-8 flex justify-between items-center font-mono text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center gap-4" style={{ color: character.color }}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ◉ SCANNING
          </motion.span>
          <span className="text-neutral-500">ID: {character.id.toUpperCase()}-{Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
        </div>
        <div className="text-neutral-500">
          MILLER AI GROUP // OPERATIVE DATABASE v2.0
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================
// SCREEN EFFECTS - Intense Watch Dogs Style
// ============================================
function ScreenGlitchEffect({ active, intensity = 'medium' }: { active: boolean; intensity?: 'low' | 'medium' | 'high' }) {
  const [glitchFrame, setGlitchFrame] = useState(0)

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setGlitchFrame(f => f + 1)
    }, 50)
    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  const intensityConfig = {
    low: { rgbOffset: 3, lines: 3, noise: 0.02 },
    medium: { rgbOffset: 8, lines: 8, noise: 0.05 },
    high: { rgbOffset: 15, lines: 15, noise: 0.1 },
  }
  const config = intensityConfig[intensity]

  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Intense RGB Split / Chromatic Aberration */}
      <motion.div
        className="absolute inset-0 mix-blend-lighten"
        style={{
          background: 'rgba(255,0,0,0.15)',
          transform: `translateX(${-config.rgbOffset + Math.random() * 4}px)`,
        }}
        animate={{
          x: [-config.rgbOffset, config.rgbOffset, -config.rgbOffset],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: 0.08, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 mix-blend-lighten"
        style={{
          background: 'rgba(0,255,0,0.1)',
          transform: `translateY(${Math.random() * 2}px)`,
        }}
        animate={{
          y: [-2, 2, -2],
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{ duration: 0.06, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 mix-blend-lighten"
        style={{
          background: 'rgba(0,0,255,0.15)',
          transform: `translateX(${config.rgbOffset - Math.random() * 4}px)`,
        }}
        animate={{
          x: [config.rgbOffset, -config.rgbOffset, config.rgbOffset],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: 0.08, repeat: Infinity }}
      />

      {/* Horizontal tear/displacement lines */}
      {[...Array(config.lines)].map((_, i) => {
        const randomY = (glitchFrame * 7 + i * 13) % 100
        const randomHeight = Math.random() * 8 + 2
        const randomOffset = (Math.random() - 0.5) * 30

        return (
          <motion.div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top: `${randomY}%`,
              height: randomHeight,
              background: `linear-gradient(90deg,
                transparent ${Math.random() * 20}%,
                rgba(255,0,255,0.3) ${20 + Math.random() * 20}%,
                rgba(0,255,255,0.2) ${50 + Math.random() * 20}%,
                transparent ${80 + Math.random() * 20}%
              )`,
              transform: `translateX(${randomOffset}px)`,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scaleX: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.1,
              repeat: Infinity,
              repeatDelay: Math.random() * 0.3,
            }}
          />
        )
      })}

      {/* Block displacement glitches */}
      {Math.random() > 0.7 && (
        <motion.div
          className="absolute bg-black"
          style={{
            top: `${Math.random() * 80}%`,
            left: `${Math.random() * 80}%`,
            width: `${Math.random() * 200 + 50}px`,
            height: `${Math.random() * 30 + 10}px`,
            transform: `translateX(${(Math.random() - 0.5) * 40}px)`,
          }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* Noise overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: config.noise,
          mixBlendMode: 'overlay',
        }}
        animate={{ opacity: [config.noise, config.noise * 2, config.noise] }}
        transition={{ duration: 0.2, repeat: Infinity }}
      />

      {/* Scanline effect */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* VHS tracking distortion */}
      <motion.div
        className="absolute left-0 right-0 h-16"
        style={{
          top: `${(glitchFrame * 3) % 110 - 10}%`,
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.1) 50%, transparent)',
          filter: 'blur(2px)',
        }}
      />
    </motion.div>
  )
}

function ScreenShakeEffect({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      animate={active ? {
        x: [0, -5, 5, -3, 3, 0],
        y: [0, 3, -3, 2, -2, 0],
      } : {}}
      transition={{ duration: 0.3, repeat: active ? Infinity : 0 }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// MAIN CINEMATIC TAKEOVER COMPONENT
// ============================================
export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  const [phase, setPhase] = useState<'init' | 'breach' | 'characters' | 'extraction' | 'final' | 'complete'>('init')
  const [currentCharacter, setCurrentCharacter] = useState(0)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [glitchActive, setGlitchActive] = useState(false)
  const [glitchIntensity, setGlitchIntensity] = useState<'low' | 'medium' | 'high'>('medium')
  const [shakeActive, setShakeActive] = useState(false)
  const [terminalCount, setTerminalCount] = useState(1)

  // Add random alerts
  const addAlert = useCallback((type: SystemAlert['type'], title: string, message: string) => {
    const alert: SystemAlert = {
      id: Math.random().toString(),
      type,
      title,
      message,
      x: Math.random() * (window.innerWidth - 350) + 25,
      y: Math.random() * (window.innerHeight - 150) + 25,
    }
    setAlerts(prev => [...prev, alert])
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  // Trigger glitch burst with intensity
  const triggerGlitch = useCallback((intensity: 'low' | 'medium' | 'high', duration: number) => {
    setGlitchIntensity(intensity)
    setGlitchActive(true)
    setShakeActive(intensity !== 'low')
    setTimeout(() => {
      setGlitchActive(false)
      setShakeActive(false)
    }, duration)
  }, [])

  // Phase progression with MORE INTENSE effects
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    if (phase === 'init') {
      // Initial breach - build tension
      timers.push(setTimeout(() => triggerGlitch('low', 150), 500))
      timers.push(setTimeout(() => addAlert('warning', 'INTRUSION DETECTED', 'Unknown entity accessing system...'), 1000))
      timers.push(setTimeout(() => triggerGlitch('medium', 200), 1500))
      timers.push(setTimeout(() => addAlert('error', 'FIREWALL ALERT', 'Breach attempt on port 443'), 2500))
      timers.push(setTimeout(() => setTerminalCount(2), 3000))
      timers.push(setTimeout(() => triggerGlitch('high', 400), 3500))
      timers.push(setTimeout(() => addAlert('error', 'CRITICAL', 'Multiple breach vectors detected'), 4000))
      timers.push(setTimeout(() => triggerGlitch('high', 500), 4500))
      timers.push(setTimeout(() => addAlert('breach', 'MILLER AI GROUP', 'System takeover initiated'), 5000))
      timers.push(setTimeout(() => triggerGlitch('medium', 300), 5500))
    }

    if (phase === 'breach') {
      timers.push(setTimeout(() => setTerminalCount(3), 500))
      timers.push(setTimeout(() => triggerGlitch('medium', 250), 1000))
      timers.push(setTimeout(() => addAlert('warning', 'PRIVILEGE ESCALATION', 'Attempting sudo bypass...'), 1500))
      timers.push(setTimeout(() => addAlert('success', 'ROOT ACCESS', 'Elevated privileges obtained'), 2500))
      timers.push(setTimeout(() => triggerGlitch('high', 600), 3000))
      timers.push(setTimeout(() => addAlert('breach', 'KERNEL ACCESS', 'Ring 0 penetration complete'), 3500))
    }

    if (phase === 'extraction') {
      timers.push(setTimeout(() => triggerGlitch('medium', 200), 500))
      timers.push(setTimeout(() => addAlert('warning', 'DATA STREAM', 'Initiating mass extraction...'), 1000))
      timers.push(setTimeout(() => addAlert('success', 'CREDENTIALS', '847 credential pairs captured'), 2000))
      timers.push(setTimeout(() => triggerGlitch('high', 400), 2500))
      timers.push(setTimeout(() => addAlert('success', 'ENCRYPTION KEYS', 'Private keys extracted'), 3000))
      timers.push(setTimeout(() => triggerGlitch('high', 500), 3500))
    }

    if (phase === 'final') {
      timers.push(setTimeout(() => triggerGlitch('high', 800), 500))
      timers.push(setTimeout(() => addAlert('breach', 'SYSTEM OWNED', 'Full control established'), 1000))
    }

    return () => timers.forEach(clearTimeout)
  }, [phase, addAlert, triggerGlitch])

  // Handle terminal completion
  const handleTerminalComplete = useCallback((terminalPhase: string) => {
    if (terminalPhase === 'init' && phase === 'init') {
      setTimeout(() => setPhase('breach'), 500)
    } else if (terminalPhase === 'breach' && phase === 'breach') {
      setTimeout(() => setPhase('characters'), 500)
    } else if (terminalPhase === 'extraction' && phase === 'extraction') {
      setTimeout(() => setPhase('final'), 500)
    } else if (terminalPhase === 'final' && phase === 'final') {
      setTimeout(() => setPhase('complete'), 1000)
    }
  }, [phase])

  // Handle character sequence
  const handleCharacterComplete = useCallback(() => {
    if (currentCharacter < CHARACTERS.length - 1) {
      setCurrentCharacter(c => c + 1)
    } else {
      setPhase('extraction')
    }
  }, [currentCharacter])

  // Complete the sequence
  useEffect(() => {
    if (phase === 'complete') {
      const timer = setTimeout(onComplete, 1500)
      return () => clearTimeout(timer)
    }
  }, [phase, onComplete])

  return (
    <ScreenShakeEffect active={shakeActive}>
      <div className="fixed inset-0 bg-black overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,65,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,65,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-green-500/50 z-10"
          style={{ boxShadow: '0 0 20px rgba(0,255,65,0.5)' }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Header bar */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-black/80 border-b border-green-500/30 flex items-center px-4 z-20">
          <motion.div
            className="w-2 h-2 rounded-full bg-red-500 mr-2"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
          <span className="font-mono text-xs text-red-500">SECURITY BREACH IN PROGRESS</span>
          <span className="ml-auto font-mono text-xs text-green-500">
            MILLER AI GROUP TAKEOVER PROTOCOL v3.0
          </span>
        </div>

        {/* Terminal windows */}
        <AnimatePresence>
          {phase !== 'characters' && phase !== 'complete' && (
            <>
              <TerminalWindow
                title="root@miller-ai:~# [MAIN]"
                lines={TERMINAL_SEQUENCES[phase] || TERMINAL_SEQUENCES.init}
                x={50}
                y={60}
                width={550}
                speed={30}
                onComplete={() => handleTerminalComplete(phase)}
              />

              {terminalCount >= 2 && (
                <TerminalWindow
                  title="root@miller-ai:~# [SCANNER]"
                  lines={[
                    { text: '$ network_scan --deep', type: 'command' },
                    { text: 'Scanning network topology...', type: 'output' },
                    { text: 'Found 24 active hosts', type: 'success' },
                    { text: 'Mapping vulnerabilities...', type: 'output' },
                    { text: '[!] Critical: CVE-2024-0001', type: 'error' },
                    { text: '[!] Critical: CVE-2024-0002', type: 'error' },
                    { text: '$ exploit_all --auto', type: 'command' },
                    { text: 'Exploiting vulnerabilities...', type: 'output' },
                    { text: '[+] 24/24 hosts compromised', type: 'success' },
                  ]}
                  x={620}
                  y={60}
                  width={450}
                  speed={40}
                />
              )}

              {terminalCount >= 3 && (
                <TerminalWindow
                  title="root@miller-ai:~# [EXFIL]"
                  lines={[
                    { text: '$ dump_memory --all', type: 'command' },
                    { text: 'Dumping system memory...', type: 'output' },
                    { text: '████████░░░░░░░░░░░░ 40%', type: 'output' },
                    { text: '████████████░░░░░░░░ 60%', type: 'output' },
                    { text: '████████████████░░░░ 80%', type: 'output' },
                    { text: '████████████████████ 100%', type: 'success' },
                    { text: '[+] Memory dump complete', type: 'success' },
                    { text: '[+] Transferring to C2 server...', type: 'output' },
                  ]}
                  x={50}
                  y={320}
                  width={500}
                  speed={50}
                />
              )}
            </>
          )}
        </AnimatePresence>

        {/* Character reveal sequence */}
        <AnimatePresence>
          {phase === 'characters' && (
            <CharacterReveal
              character={CHARACTERS[currentCharacter]}
              onComplete={handleCharacterComplete}
            />
          )}
        </AnimatePresence>

        {/* System alerts */}
        <AnimatePresence>
          {alerts.map(alert => (
            <SystemAlertPopup
              key={alert.id}
              alert={alert}
              onDismiss={() => removeAlert(alert.id)}
            />
          ))}
        </AnimatePresence>

        {/* Glitch effects */}
        <AnimatePresence>
          {glitchActive && <ScreenGlitchEffect active={glitchActive} intensity={glitchIntensity} />}
        </AnimatePresence>

        {/* Final takeover message */}
        <AnimatePresence>
          {phase === 'complete' && (
            <motion.div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring' }}
              >
                <motion.div
                  className="mb-8"
                  animate={{
                    boxShadow: [
                      '0 0 60px rgba(255,0,255,0.3)',
                      '0 0 120px rgba(255,0,255,0.6)',
                      '0 0 60px rgba(255,0,255,0.3)',
                    ],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Image
                    src="/logos/miller-ai-group.png"
                    alt="Miller AI Group"
                    width={120}
                    height={120}
                    className="mx-auto rounded-2xl"
                  />
                </motion.div>
                <h1
                  className="text-5xl font-bold font-mono mb-4"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 30px rgba(255,0,255,0.8)',
                  }}
                >
                  <GlitchText intensity={0.5}>SYSTEM COMPROMISED</GlitchText>
                </h1>
                <p className="text-xl font-mono text-green-400 mb-2">
                  Welcome, {userName}
                </p>
                <p className="text-sm font-mono text-neutral-500">
                  You are now part of Miller AI Group
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        <div className="absolute bottom-4 left-4 right-4 z-30">
          <div className="flex items-center gap-2 mb-2">
            {['init', 'breach', 'characters', 'extraction', 'final'].map((p, i) => (
              <motion.div
                key={p}
                className="h-1 flex-1 rounded-full"
                style={{
                  background: ['init', 'breach', 'characters', 'extraction', 'final'].indexOf(phase) >= i
                    ? '#ff00ff'
                    : 'rgba(255,255,255,0.1)',
                }}
                animate={phase === p ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            ))}
          </div>
          <p className="font-mono text-xs text-fuchsia-400 text-center">
            {phase === 'init' && 'INITIALIZING BREACH...'}
            {phase === 'breach' && 'ESCALATING PRIVILEGES...'}
            {phase === 'characters' && `DEPLOYING OPERATIVE ${currentCharacter + 1}/${CHARACTERS.length}...`}
            {phase === 'extraction' && 'EXTRACTING DATA...'}
            {phase === 'final' && 'COMPLETING TAKEOVER...'}
            {phase === 'complete' && 'ACCESS GRANTED'}
          </p>
        </div>
      </div>
    </ScreenShakeEffect>
  )
}

export { CHARACTERS }
export type { CinematicTakeoverProps }

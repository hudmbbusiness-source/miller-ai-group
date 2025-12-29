'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface CinematicTakeoverProps {
  onComplete: () => void
  userName?: string
}

export const CHARACTERS: never[] = []

// Raw terminal hack simulation
export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  const [lines, setLines] = useState<string[]>([])
  const [phase, setPhase] = useState<'hack' | 'pwned'>('hack')
  const [mounted, setMounted] = useState(false)
  const [sessionId, setSessionId] = useState('0000')
  const [timestamp, setTimestamp] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Set dynamic values after mount to avoid hydration mismatch
  useEffect(() => {
    setSessionId(Date.now().toString(16))
    setTimestamp(new Date().toISOString())
    setMounted(true)
  }, [])

  // Type out hack script - only start after mounted
  useEffect(() => {
    if (!mounted) return

    const script = [
      `$ nmap -sV -sC 10.0.0.1`,
      `Starting Nmap 7.94 ( https://nmap.org )`,
      `Discovered open port 22/tcp on 10.0.0.1`,
      `Discovered open port 443/tcp on 10.0.0.1`,
      `Discovered open port 3306/tcp on 10.0.0.1`,
      ``,
      `$ hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://10.0.0.1`,
      `[22][ssh] host: 10.0.0.1   login: root   password: ********`,
      ``,
      `$ ssh root@10.0.0.1`,
      `root@10.0.0.1's password: `,
      `Last login: ${timestamp}`,
      ``,
      `root@target:~# whoami`,
      `root`,
      `root@target:~# id`,
      `uid=0(root) gid=0(root) groups=0(root)`,
      `root@target:~# cat /etc/shadow | head -3`,
      `root:$6$rounds=656000$salt$hash...:19000:0:99999:7:::`,
      `admin:$6$rounds=656000$salt$hash...:19000:0:99999:7:::`,
      `${userName.toLowerCase()}:$6$rounds=656000$salt$hash...:19000:0:99999:7:::`,
      ``,
      `root@target:~# ./miller-ai-payload --deploy`,
      `[*] Deploying Miller AI backdoor...`,
      `[*] Modifying /etc/rc.local...`,
      `[*] Installing persistence mechanism...`,
      `[+] Persistence installed`,
      `[*] Establishing C2 connection...`,
      `[+] Connected to c2.miller-ai.group:443`,
      `[*] Exfiltrating credentials...`,
      `[+] Credentials exfiltrated`,
      ``,
      `[+] TARGET COMPROMISED`,
      `[+] SYSTEM OWNED`,
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < script.length) {
        setLines(prev => [...prev, script[i]])
        i++
        // Auto scroll
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      } else {
        clearInterval(interval)
        setTimeout(() => setPhase('pwned'), 800)
      }
    }, 120)

    return () => clearInterval(interval)
  }, [mounted, timestamp, userName])

  // Complete after pwned screen
  useEffect(() => {
    if (phase === 'pwned') {
      const timer = setTimeout(onComplete, 4000)
      return () => clearTimeout(timer)
    }
  }, [phase, onComplete])

  // Pre-computed random values to avoid hydration mismatch
  const glitchLines = Array.from({ length: 20 }, (_, i) => ({
    top: (i * 5) % 100,
    delay: (i * 0.1) % 2,
    repeatDelay: (i * 0.15) % 3,
  }))

  if (phase === 'pwned') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center font-mono overflow-hidden">
        {/* Glitch background */}
        <div className="absolute inset-0">
          {glitchLines.map((line, i) => (
            <motion.div
              key={i}
              className="absolute h-px bg-red-500/30"
              style={{
                top: `${line.top}%`,
                left: 0,
                right: 0,
              }}
              animate={{
                opacity: [0, 1, 0],
                scaleX: [0, 1, 0],
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                delay: line.delay,
                repeatDelay: line.repeatDelay,
              }}
            />
          ))}
        </div>

        {/* CRT scanlines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 2px)',
          }}
        />

        <div className="relative z-10 text-center px-4">
          {/* PWNED ASCII */}
          <motion.pre
            className="text-red-500 text-xs md:text-sm mb-6"
            style={{ textShadow: '0 0 10px rgba(255,0,0,0.8)' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
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

          {/* Main text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1
              className="text-4xl md:text-6xl font-bold text-red-500 mb-4"
              style={{ textShadow: '0 0 20px rgba(255,0,0,0.5), 2px 2px 0 #000' }}
            >
              SYSTEM OWNED
            </h1>

            <div className="text-green-500 text-lg md:text-xl mb-2">
              MILLER AI GROUP
            </div>

            <div className="text-green-600 text-sm">
              Welcome, {userName}
            </div>
          </motion.div>

          {/* Blinking cursor */}
          <motion.div
            className="mt-8 text-green-500 text-sm"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            root@miller-ai:~# █
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-8 flex justify-center gap-8 text-xs text-green-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div>
              <div className="text-green-500 text-lg">3</div>
              <div>PORTS</div>
            </div>
            <div>
              <div className="text-green-500 text-lg">ROOT</div>
              <div>ACCESS</div>
            </div>
            <div>
              <div className="text-green-500 text-lg">OK</div>
              <div>C2</div>
            </div>
          </motion.div>
        </div>

        {/* Corner info */}
        <div className="absolute top-4 left-4 text-xs text-red-500/60 font-mono">
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
            ● REC
          </motion.span>
        </div>
        <div className="absolute top-4 right-4 text-xs text-green-600 font-mono">
          {timestamp}
        </div>
        <div className="absolute bottom-4 left-4 text-xs text-green-800 font-mono">
          Session: {sessionId}
        </div>
        <div className="absolute bottom-4 right-4 text-xs text-green-800 font-mono">
          miller-ai v2.0
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 font-mono overflow-hidden">
      {/* CRT effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
        }}
      />

      {/* Terminal */}
      <div className="h-full flex flex-col p-4">
        {/* Title bar */}
        <div className="flex items-center gap-2 mb-2 text-xs">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-green-600 ml-2">root@kali:~</span>
          <motion.span
            className="ml-auto text-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            ● LIVE
          </motion.span>
        </div>

        {/* Terminal content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto text-sm leading-relaxed"
          style={{ scrollBehavior: 'smooth' }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith('$') ? 'text-green-400' :
                line.startsWith('[+]') ? 'text-green-500' :
                line.startsWith('[*]') ? 'text-blue-400' :
                line.startsWith('[-]') ? 'text-red-500' :
                line.includes('COMPROMISED') || line.includes('OWNED') ? 'text-red-500 font-bold' :
                line.includes('root@') ? 'text-green-400' :
                line.includes('password') ? 'text-yellow-500' :
                'text-green-600'
              }
            >
              {line || '\u00A0'}
            </div>
          ))}
          <motion.span
            className="text-green-500"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            █
          </motion.span>
        </div>

        {/* Status bar */}
        <div className="mt-2 pt-2 border-t border-green-900 flex justify-between text-xs text-green-700">
          <span>Target: 10.0.0.1</span>
          <span>Lines: {lines.length}/34</span>
          <span>Status: {phase === 'hack' ? 'EXECUTING' : 'COMPLETE'}</span>
        </div>
      </div>
    </div>
  )
}

export type { CinematicTakeoverProps }

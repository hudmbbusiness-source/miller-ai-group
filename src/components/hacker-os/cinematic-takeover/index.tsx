'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface CinematicTakeoverProps {
  onComplete: () => void
  userName?: string
}

export const CHARACTERS: never[] = []

// High-budget terminal hack simulation - pure CSS, no framer-motion
export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  const [lines, setLines] = useState<string[]>([])
  const [phase, setPhase] = useState<'hack' | 'pwned'>('hack')
  const [mounted, setMounted] = useState(false)
  const [sessionId, setSessionId] = useState('0000')
  const [timestamp, setTimestamp] = useState('LIVE')
  const containerRef = useRef<HTMLDivElement>(null)
  const hasStartedRef = useRef(false)

  // Memoize onComplete to prevent issues
  const handleComplete = useCallback(() => {
    onComplete()
  }, [onComplete])

  // Set dynamic values after mount
  useEffect(() => {
    setSessionId(Date.now().toString(16).toUpperCase())
    setTimestamp(new Date().toISOString())
    setMounted(true)
  }, [])

  // Type out hack script
  useEffect(() => {
    if (!mounted || hasStartedRef.current) return
    hasStartedRef.current = true

    const script = [
      '$ nmap -sV -sC 10.0.0.1',
      'Starting Nmap 7.94 ( https://nmap.org )',
      'Discovered open port 22/tcp on 10.0.0.1',
      'Discovered open port 443/tcp on 10.0.0.1',
      'Discovered open port 3306/tcp on 10.0.0.1',
      '',
      '$ hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://10.0.0.1',
      '[22][ssh] host: 10.0.0.1   login: root   password: ********',
      '',
      '$ ssh root@10.0.0.1',
      "root@10.0.0.1's password: ",
      `Last login: ${timestamp}`,
      '',
      'root@target:~# whoami',
      'root',
      'root@target:~# id',
      'uid=0(root) gid=0(root) groups=0(root)',
      'root@target:~# cat /etc/shadow | head -3',
      'root:$6$rounds=656000$salt$hash...:19000:0:99999:7:::',
      'admin:$6$rounds=656000$salt$hash...:19000:0:99999:7:::',
      `${userName.toLowerCase()}:$6$rounds=656000$salt$hash...:19000:0:99999:7:::`,
      '',
      'root@target:~# ./miller-ai-payload --deploy',
      '[*] Deploying Miller AI backdoor...',
      '[*] Modifying /etc/rc.local...',
      '[*] Installing persistence mechanism...',
      '[+] Persistence installed',
      '[*] Establishing C2 connection...',
      '[+] Connected to c2.miller-ai.group:443',
      '[*] Exfiltrating credentials...',
      '[+] Credentials exfiltrated',
      '',
      '[+] TARGET COMPROMISED',
      '[+] SYSTEM OWNED',
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < script.length) {
        setLines(prev => [...prev, script[i]])
        i++
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      } else {
        clearInterval(interval)
        setTimeout(() => setPhase('pwned'), 800)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [mounted, timestamp, userName])

  // Complete after pwned screen
  useEffect(() => {
    if (phase === 'pwned') {
      const timer = setTimeout(handleComplete, 4000)
      return () => clearTimeout(timer)
    }
  }, [phase, handleComplete])

  const getLineClass = (line: string) => {
    if (line.startsWith('$')) return 'text-green-400'
    if (line.startsWith('[+]')) return 'text-green-500'
    if (line.startsWith('[*]')) return 'text-blue-400'
    if (line.startsWith('[-]')) return 'text-red-500'
    if (line.includes('COMPROMISED') || line.includes('OWNED')) return 'text-red-500 font-bold'
    if (line.includes('root@')) return 'text-green-400'
    if (line.includes('password')) return 'text-yellow-500'
    return 'text-green-600'
  }

  // ============ PWNED PHASE ============
  if (phase === 'pwned') {
    return (
      <div className="fixed inset-0 bg-black z-50 overflow-hidden font-mono">
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
          }}
        />

        {/* Glitch overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-0 right-0 h-px bg-red-500/40 animate-pulse" />
          <div className="absolute top-[30%] left-0 right-0 h-px bg-red-500/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[50%] left-0 right-0 h-px bg-red-500/20 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[70%] left-0 right-0 h-px bg-red-500/30 animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="absolute top-[90%] left-0 right-0 h-px bg-red-500/40 animate-pulse" style={{ animationDelay: '0.7s' }} />
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%)',
          }}
        />

        {/* Main content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          {/* ASCII PWNED - responsive */}
          <pre
            className="text-red-500 text-[8px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base mb-4 md:mb-8 font-bold text-center leading-tight animate-pulse"
            style={{
              textShadow: '0 0 10px rgba(255,0,0,0.8), 0 0 20px rgba(255,0,0,0.4)',
            }}
          >
{`██████╗ ██╗    ██╗███╗   ██╗███████╗██████╗
██╔══██╗██║    ██║████╗  ██║██╔════╝██╔══██╗
██████╔╝██║ █╗ ██║██╔██╗ ██║█████╗  ██║  ██║
██╔═══╝ ██║███╗██║██║╚██╗██║██╔══╝  ██║  ██║
██║     ╚███╔███╔╝██║ ╚████║███████╗██████╔╝
╚═╝      ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝╚═════╝`}
          </pre>

          {/* SYSTEM OWNED */}
          <h1
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-red-500 mb-4 tracking-wider animate-pulse"
            style={{
              textShadow: '0 0 30px rgba(255,0,0,0.6), 0 0 60px rgba(255,0,0,0.3), 4px 4px 0 #000',
              animationDuration: '2s',
            }}
          >
            SYSTEM OWNED
          </h1>

          {/* Miller AI Group */}
          <div
            className="text-green-500 text-xl sm:text-2xl md:text-3xl font-bold mb-2 tracking-widest"
            style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}
          >
            MILLER AI GROUP
          </div>

          {/* Welcome message */}
          <div className="text-green-600 text-sm md:text-base mb-8">
            Welcome, <span className="text-green-400">{userName}</span>
          </div>

          {/* Terminal prompt */}
          <div className="text-green-500 text-sm md:text-base font-mono">
            root@miller-ai:~# <span className="animate-pulse">█</span>
          </div>

          {/* Stats row */}
          <div className="mt-8 md:mt-12 flex gap-8 md:gap-16 text-center">
            <div>
              <div className="text-green-400 text-2xl md:text-4xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>3</div>
              <div className="text-green-700 text-xs uppercase tracking-wider">Ports</div>
            </div>
            <div>
              <div className="text-green-400 text-2xl md:text-4xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>ROOT</div>
              <div className="text-green-700 text-xs uppercase tracking-wider">Access</div>
            </div>
            <div>
              <div className="text-green-400 text-2xl md:text-4xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>OK</div>
              <div className="text-green-700 text-xs uppercase tracking-wider">C2</div>
            </div>
          </div>
        </div>

        {/* Corner elements */}
        <div className="absolute top-4 left-4 text-red-500 text-xs font-mono animate-pulse">
          ● REC
        </div>
        <div className="absolute top-4 right-4 text-green-600 text-xs font-mono">
          {timestamp}
        </div>
        <div className="absolute bottom-4 left-4 text-green-800 text-xs font-mono">
          SESSION: {sessionId}
        </div>
        <div className="absolute bottom-4 right-4 text-green-800 text-xs font-mono">
          MILLER-AI v2.0
        </div>

      </div>
    )
  }

  // ============ HACK PHASE ============
  return (
    <div className="fixed inset-0 bg-black z-50 font-mono overflow-hidden">
      {/* CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-50"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
        }}
      />

      {/* Terminal window */}
      <div className="h-full flex flex-col p-4">
        {/* Title bar */}
        <div className="flex items-center gap-2 mb-2 text-xs">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-green-600 ml-2">root@kali:~</span>
          <span className="ml-auto text-red-500 animate-pulse">● LIVE</span>
        </div>

        {/* Terminal content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto text-sm leading-relaxed"
          style={{ scrollBehavior: 'smooth' }}
        >
          {lines.map((line, i) => (
            <div key={i} className={getLineClass(line)}>
              {line || '\u00A0'}
            </div>
          ))}
          <span className="text-green-500 animate-pulse">█</span>
        </div>

        {/* Status bar */}
        <div className="mt-2 pt-2 border-t border-green-900 flex justify-between text-xs text-green-700">
          <span>Target: 10.0.0.1</span>
          <span>Lines: {lines.length}/34</span>
          <span>Status: EXECUTING</span>
        </div>
      </div>
    </div>
  )
}

export type { CinematicTakeoverProps }

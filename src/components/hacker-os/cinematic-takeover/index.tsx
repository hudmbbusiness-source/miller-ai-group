'use client'

import { useState, useEffect, useRef } from 'react'

interface CinematicTakeoverProps {
  onComplete: () => void
  userName?: string
}

export const CHARACTERS: never[] = []

export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  const [lines, setLines] = useState<string[]>([])
  const [showPwned, setShowPwned] = useState(false)
  const [sessionId, setSessionId] = useState('0000')
  const [timestamp, setTimestamp] = useState('LIVE')
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptStarted = useRef(false)
  const completeTimeout = useRef<NodeJS.Timeout | null>(null)

  // Initialize on mount
  useEffect(() => {
    setSessionId(Date.now().toString(16).toUpperCase())
    setTimestamp(new Date().toISOString())
  }, [])

  // Run the hack script
  useEffect(() => {
    if (scriptStarted.current) return
    scriptStarted.current = true

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
      'Last login: ' + new Date().toISOString(),
      '',
      'root@target:~# whoami',
      'root',
      'root@target:~# id',
      'uid=0(root) gid=0(root) groups=0(root)',
      'root@target:~# cat /etc/shadow | head -3',
      'root:$6$rounds=656000$salt$hash...:19000:0:99999:7:::',
      'admin:$6$rounds=656000$salt$hash...:19000:0:99999:7:::',
      userName.toLowerCase() + ':$6$rounds=656000$salt$hash...:19000:0:99999:7:::',
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

    let lineIndex = 0

    const addLine = () => {
      if (lineIndex < script.length) {
        const newLine = script[lineIndex]
        if (newLine !== undefined) {
          setLines(prev => [...prev, newLine])
        }
        lineIndex++

        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }

        setTimeout(addLine, 100)
      } else {
        // Script complete - show pwned after delay
        setTimeout(() => {
          setShowPwned(true)
          // Call onComplete after showing pwned for 4 seconds
          completeTimeout.current = setTimeout(() => {
            onComplete()
          }, 4000)
        }, 800)
      }
    }

    // Start the script
    setTimeout(addLine, 500)

    return () => {
      if (completeTimeout.current) {
        clearTimeout(completeTimeout.current)
      }
    }
  }, [userName, onComplete])

  const getLineColor = (line: string | undefined): string => {
    if (!line) return 'text-green-600'
    if (line.startsWith('$')) return 'text-green-400'
    if (line.startsWith('[+]')) return 'text-green-500'
    if (line.startsWith('[*]')) return 'text-blue-400'
    if (line.startsWith('[-]')) return 'text-red-500'
    if (line.includes('COMPROMISED') || line.includes('OWNED')) return 'text-red-500 font-bold'
    if (line.includes('root@')) return 'text-green-400'
    if (line.includes('password')) return 'text-yellow-500'
    return 'text-green-600'
  }

  return (
    <div className="fixed inset-0 bg-black z-50 font-mono overflow-hidden">
      {/* HACK PHASE - visible when showPwned is false */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${showPwned ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {/* CRT scanlines */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-50"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
          }}
        />

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
          >
            {lines.filter(line => line !== undefined).map((line, i) => (
              <div key={i} className={getLineColor(line)}>
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

      {/* PWNED PHASE - visible when showPwned is true */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${showPwned ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
          }}
        />

        {/* Glitch lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-0 right-0 h-px bg-red-500/40 animate-pulse" />
          <div className="absolute top-[30%] left-0 right-0 h-px bg-red-500/30 animate-pulse" />
          <div className="absolute top-[50%] left-0 right-0 h-px bg-red-500/20 animate-pulse" />
          <div className="absolute top-[70%] left-0 right-0 h-px bg-red-500/30 animate-pulse" />
          <div className="absolute top-[90%] left-0 right-0 h-px bg-red-500/40 animate-pulse" />
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%)',
          }}
        />

        {/* Main content */}
        <div className="relative z-10 text-center px-4">
          {/* ASCII PWNED */}
          <pre
            className="text-red-500 text-[8px] sm:text-xs md:text-sm mb-4 md:mb-8 font-bold leading-tight animate-pulse"
            style={{ textShadow: '0 0 10px rgba(255,0,0,0.8), 0 0 20px rgba(255,0,0,0.4)' }}
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
            className="text-4xl sm:text-5xl md:text-7xl font-black text-red-500 mb-4 tracking-wider animate-pulse"
            style={{ textShadow: '0 0 30px rgba(255,0,0,0.6), 0 0 60px rgba(255,0,0,0.3), 4px 4px 0 #000' }}
          >
            SYSTEM OWNED
          </h1>

          <div
            className="text-green-500 text-xl sm:text-2xl md:text-3xl font-bold mb-2 tracking-widest"
            style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}
          >
            MILLER AI GROUP
          </div>

          <div className="text-green-600 text-sm md:text-base mb-8">
            Welcome, <span className="text-green-400">{userName}</span>
          </div>

          <div className="text-green-500 text-sm md:text-base">
            root@miller-ai:~# <span className="animate-pulse">█</span>
          </div>

          {/* Stats */}
          <div className="mt-8 md:mt-12 flex justify-center gap-8 md:gap-16 text-center">
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
        <div className="absolute top-4 left-4 text-red-500 text-xs animate-pulse">● REC</div>
        <div className="absolute top-4 right-4 text-green-600 text-xs">{timestamp}</div>
        <div className="absolute bottom-4 left-4 text-green-800 text-xs">SESSION: {sessionId}</div>
        <div className="absolute bottom-4 right-4 text-green-800 text-xs">MILLER-AI v2.0</div>
      </div>
    </div>
  )
}

export type { CinematicTakeoverProps }

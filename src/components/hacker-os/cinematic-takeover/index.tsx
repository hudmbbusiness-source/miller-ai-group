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
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('INITIALIZING')
  const [glitchActive, setGlitchActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptStarted = useRef(false)
  const completeTimeout = useRef<NodeJS.Timeout | null>(null)

  // Initialize on mount
  useEffect(() => {
    setSessionId(Date.now().toString(16).toUpperCase())
    setTimestamp(new Date().toISOString())
  }, [])

  // Random glitch effect
  useEffect(() => {
    if (showPwned) return

    const glitchInterval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 100)
    }, 2000 + Math.random() * 3000)

    return () => clearInterval(glitchInterval)
  }, [showPwned])

  // Run the hack script
  useEffect(() => {
    if (scriptStarted.current) return
    scriptStarted.current = true

    const phases = [
      { at: 0, name: 'RECONNAISSANCE' },
      { at: 5, name: 'SCANNING PORTS' },
      { at: 10, name: 'EXPLOITING' },
      { at: 18, name: 'PRIVILEGE ESCALATION' },
      { at: 25, name: 'INSTALLING BACKDOOR' },
      { at: 30, name: 'ESTABLISHING C2' },
      { at: 33, name: 'EXFILTRATING' },
    ]

    const script = [
      '> Initializing attack vector...',
      '> Loading exploit modules...',
      '',
      '$ nmap -sV -sC -A 10.0.0.1',
      '[+] Host is up (0.0023s latency)',
      '[+] PORT     STATE SERVICE    VERSION',
      '[+] 22/tcp   open  ssh        OpenSSH 8.2',
      '[+] 443/tcp  open  https      nginx 1.18.0',
      '[+] 3306/tcp open  mysql      MySQL 8.0.23',
      '',
      '$ msfconsole -q -x "use exploit/linux/ssh/openssh"',
      '[*] Loading payload linux/x64/meterpreter/reverse_tcp',
      '[*] Starting exploit handler...',
      '',
      '$ hydra -l root -P rockyou.txt ssh://10.0.0.1 -t 64',
      '[!] BRUTE FORCE IN PROGRESS...',
      '[+] CREDENTIALS FOUND: root:************',
      '',
      '$ ssh root@10.0.0.1',
      'root@target:~# id',
      'uid=0(root) gid=0(root) groups=0(root)',
      '',
      'root@target:~# cat /etc/shadow',
      'root:$6$xyz...:19000:0:99999:7:::',
      userName.toLowerCase() + ':$6$abc...:19000:0:99999:7:::',
      '',
      'root@target:~# ./payload --install --persist',
      '[*] Installing kernel module...',
      '[+] Rootkit installed successfully',
      '[*] Connecting to C2 server...',
      '[+] C2 LINK ESTABLISHED: miller-ai.group:443',
      '',
      '[*] Exfiltrating sensitive data...',
      '[+] 247 credentials harvested',
      '[+] 1.2GB data exfiltrated',
      '',
      '████████████████████████████████████████',
      '[!] TARGET FULLY COMPROMISED',
      '[!] SYSTEM OWNED BY MILLER AI GROUP',
    ]

    let lineIndex = 0

    const addLine = () => {
      if (lineIndex < script.length) {
        const newLine = script[lineIndex]
        if (newLine !== undefined) {
          setLines(prev => [...prev, newLine])
        }

        // Update progress
        setProgress(Math.floor((lineIndex / script.length) * 100))

        // Update phase
        const phase = phases.filter(p => p.at <= lineIndex).pop()
        if (phase) setCurrentPhase(phase.name)

        lineIndex++

        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }

        // Trigger glitch on important lines
        if (newLine?.includes('[+]') || newLine?.includes('[!]')) {
          setGlitchActive(true)
          setTimeout(() => setGlitchActive(false), 50)
        }

        setTimeout(addLine, 80)
      } else {
        setProgress(100)
        setCurrentPhase('COMPLETE')
        setTimeout(() => {
          setShowPwned(true)
          completeTimeout.current = setTimeout(() => {
            onComplete()
          }, 4000)
        }, 800)
      }
    }

    setTimeout(addLine, 500)

    return () => {
      if (completeTimeout.current) {
        clearTimeout(completeTimeout.current)
      }
    }
  }, [userName, onComplete])

  const getLineColor = (line: string | undefined): string => {
    if (!line) return 'text-green-600'
    if (line.startsWith('>')) return 'text-cyan-400'
    if (line.startsWith('$')) return 'text-green-400'
    if (line.startsWith('[+]')) return 'text-green-500'
    if (line.startsWith('[*]')) return 'text-blue-400'
    if (line.startsWith('[!]')) return 'text-red-500 font-bold'
    if (line.startsWith('███')) return 'text-red-500'
    if (line.includes('root@')) return 'text-yellow-400'
    if (line.includes('COMPROMISED') || line.includes('OWNED')) return 'text-red-500 font-bold animate-pulse'
    return 'text-green-600/80'
  }

  return (
    <div className="fixed inset-0 bg-black z-50 font-mono overflow-hidden">
      {/* Glitch overlay */}
      {glitchActive && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-red-500/10" />
          <div className="absolute top-1/3 left-0 right-0 h-1 bg-cyan-500/50" />
          <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-red-500/50" />
        </div>
      )}

      {/* HACK PHASE */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${showPwned ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* CRT scanlines */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-30"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 2px)',
          }}
        />

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between border-b border-green-900/50 bg-black/80 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 text-xs font-bold">LIVE BREACH</span>
            </div>
            <div className="text-green-600 text-xs">
              SESSION: {sessionId}
            </div>
          </div>
          <div className="text-green-500 text-xs">
            {timestamp}
          </div>
        </div>

        {/* Side panel - Attack phases */}
        <div className="absolute top-16 right-4 w-48 text-xs z-20">
          <div className="border border-green-900/50 bg-black/80 p-3">
            <div className="text-green-500 mb-2 font-bold">[ ATTACK PHASE ]</div>
            <div className="text-cyan-400 animate-pulse">{currentPhase}</div>

            <div className="mt-3 text-green-500 font-bold">[ PROGRESS ]</div>
            <div className="mt-1 h-2 bg-green-900/30 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-green-400 text-right mt-1">{progress}%</div>
          </div>
        </div>

        {/* Main terminal */}
        <div className="h-full flex flex-col pt-16 pb-16">
          <div className="flex-1 flex">
            {/* Left margin with line indicators */}
            <div className="w-12 flex-shrink-0" />

            {/* Terminal content */}
            <div className="flex-1 flex flex-col p-4 max-w-4xl">
              <div className="flex items-center gap-2 mb-4 text-xs">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-green-600">root@kali</span>
                <span className="text-green-500">:</span>
                <span className="text-blue-400">~/exploit</span>
                <span className="text-green-500">#</span>
              </div>

              <div
                ref={containerRef}
                className="flex-1 overflow-y-auto text-sm leading-relaxed pr-4"
              >
                {lines.filter(line => line !== undefined).map((line, i) => (
                  <div key={i} className={`${getLineColor(line)} ${line?.startsWith('[!]') ? 'text-lg' : ''}`}>
                    {line || '\u00A0'}
                  </div>
                ))}
                <span className="text-green-500 animate-pulse">█</span>
              </div>
            </div>

            {/* Right margin */}
            <div className="w-48 flex-shrink-0" />
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between border-t border-green-900/50 bg-black/80 z-20 text-xs">
          <div className="flex items-center gap-6">
            <span className="text-green-600">TARGET: 10.0.0.1</span>
            <span className="text-green-600">PROTOCOL: SSH/HTTPS</span>
            <span className="text-green-600">LATENCY: 23ms</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-green-500">PACKETS: {Math.floor(progress * 127)}</span>
            <span className="text-green-500">LINES: {lines.length}/37</span>
          </div>
        </div>
      </div>

      {/* PWNED PHASE */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${showPwned ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Dramatic red scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,0,0,0.1) 3px, rgba(255,0,0,0.1) 6px)',
          }}
        />

        {/* Animated glitch lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[10, 25, 40, 55, 70, 85].map((top, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px bg-red-500/40 animate-pulse"
              style={{ top: `${top}%`, animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.9) 100%)' }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-4">
          {/* Skull ASCII or PWNED */}
          <pre
            className="text-red-500 text-[6px] xs:text-[8px] sm:text-xs md:text-sm mb-6 font-bold leading-none"
            style={{ textShadow: '0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.4)' }}
          >
{`    ██████╗ ██╗    ██╗███╗   ██╗███████╗██████╗
    ██╔══██╗██║    ██║████╗  ██║██╔════╝██╔══██╗
    ██████╔╝██║ █╗ ██║██╔██╗ ██║█████╗  ██║  ██║
    ██╔═══╝ ██║███╗██║██║╚██╗██║██╔══╝  ██║  ██║
    ██║     ╚███╔███╔╝██║ ╚████║███████╗██████╔╝
    ╚═╝      ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝╚═════╝`}
          </pre>

          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-black text-red-500 mb-6 tracking-widest"
            style={{ textShadow: '0 0 40px rgba(255,0,0,0.7), 0 0 80px rgba(255,0,0,0.4), 4px 4px 0 #000' }}
          >
            SYSTEM OWNED
          </h1>

          <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-red-500 to-transparent mb-6" />

          <div
            className="text-green-400 text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-[0.3em]"
            style={{ textShadow: '0 0 20px rgba(0,255,0,0.6)' }}
          >
            MILLER AI GROUP
          </div>

          <div className="text-green-600 text-lg mb-8">
            Access Granted: <span className="text-green-400 font-bold">{userName}</span>
          </div>

          <div className="text-green-500 text-sm font-mono">
            root@miller-ai:~# <span className="animate-pulse">█</span>
          </div>

          {/* Stats */}
          <div className="mt-10 flex justify-center gap-12 text-center">
            <div className="border border-green-900/50 px-6 py-3 bg-black/50">
              <div className="text-green-400 text-3xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>3</div>
              <div className="text-green-700 text-xs uppercase tracking-widest">Ports</div>
            </div>
            <div className="border border-green-900/50 px-6 py-3 bg-black/50">
              <div className="text-green-400 text-3xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>ROOT</div>
              <div className="text-green-700 text-xs uppercase tracking-widest">Access</div>
            </div>
            <div className="border border-green-900/50 px-6 py-3 bg-black/50">
              <div className="text-green-400 text-3xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>247</div>
              <div className="text-green-700 text-xs uppercase tracking-widest">Creds</div>
            </div>
          </div>
        </div>

        {/* Corner elements */}
        <div className="absolute top-4 left-4 text-red-500 text-xs font-bold animate-pulse">● REC</div>
        <div className="absolute top-4 right-4 text-green-600 text-xs font-mono">{timestamp}</div>
        <div className="absolute bottom-4 left-4 text-green-800 text-xs font-mono">SESSION: {sessionId}</div>
        <div className="absolute bottom-4 right-4 text-green-800 text-xs font-mono">MILLER-AI v2.0</div>
      </div>
    </div>
  )
}

export type { CinematicTakeoverProps }

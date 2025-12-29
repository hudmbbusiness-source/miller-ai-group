'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Github, Loader2, Shield, Terminal, Wifi, Lock, Eye } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CinematicTakeover } from '@/components/hacker-os/cinematic-takeover'
import { AudioEngineProvider, useAudioEngine } from '@/components/hacker-os'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTakeover, setShowTakeover] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('Operator')
  const [mounted, setMounted] = useState(false)
  const [glitchText, setGlitchText] = useState(false)
  const [systemTime, setSystemTime] = useState('--:--:--')
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')
  const router = useRouter()
  const searchParams = useSearchParams()
  const audioEngine = useAudioEngine()

  // Mount effect
  useEffect(() => {
    setMounted(true)
    // Set initial time
    setSystemTime(new Date().toLocaleTimeString())
    setConnectionStatus('SECURE')

    // Update time every second
    const timeInterval = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString())
    }, 1000)

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      setGlitchText(true)
      setTimeout(() => setGlitchText(false), 100)
    }, 3000 + Math.random() * 4000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(glitchInterval)
    }
  }, [])

  // Auth check effect
  useEffect(() => {
    if (!mounted) return

    const authError = searchParams.get('error')
    if (authError) {
      setError('Authentication failed. Try again.')
    }

    const takeover = searchParams.get('takeover')
    if (takeover === 'true') {
      const checkAuthAndTakeover = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setIsAuthenticated(true)
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Operator')
          await audioEngine.initialize()
          await audioEngine.playIntroSong()
          setShowTakeover(true)
        }
      }
      checkAuthAndTakeover()
    } else {
      const checkAuth = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setIsAuthenticated(true)
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Operator')
        }
      }
      checkAuth()
    }
  }, [mounted, searchParams])

  const handleGitHubLogin = async () => {
    setLoading(true)
    setError(null)

    await audioEngine.initialize()
    audioEngine.playEffect('button_click')

    localStorage.clear()
    sessionStorage.clear()

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/login&takeover=true`,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        setError(`Auth failed: ${error.message}`)
        setLoading(false)
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        setError('OAuth configuration error')
        setLoading(false)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  const soundtrackCleanupRef = useRef<(() => void) | null>(null)

  const handleEnterSystem = async () => {
    await audioEngine.initialize()
    audioEngine.playEffect('button_click')
    // Use Web Audio API soundtrack (more reliable than MP3)
    soundtrackCleanupRef.current = audioEngine.playCinematicSoundtrack(60)
    setShowTakeover(true)
  }

  const handleTakeoverComplete = useCallback(() => {
    // Stop the soundtrack
    if (soundtrackCleanupRef.current) {
      soundtrackCleanupRef.current()
      soundtrackCleanupRef.current = null
    }
    audioEngine.stopIntroSong()
    router.push('/app')
  }, [router, audioEngine])

  // Show cinematic takeover
  if (showTakeover) {
    return (
      <CinematicTakeover
        onComplete={handleTakeoverComplete}
        userName={userName}
      />
    )
  }

  // Show login form
  return (
    <div className="min-h-screen bg-black text-green-500 font-mono overflow-hidden relative">
      {/* CRT Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-30"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 2px)',
        }}
      />

      {/* Animated grid background */}
      <div
        className="fixed inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Glitch overlay */}
      {glitchText && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 bg-red-500/5" />
          <div className="absolute top-1/4 left-0 right-0 h-px bg-cyan-500/30" />
          <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-green-500/30" />
        </div>
      )}

      {/* Top HUD Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 border-b border-green-900/50 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-500">{connectionStatus}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-green-700">
              <Wifi className="w-3 h-3" />
              <span>ENCRYPTED</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-green-600">
            <span className="hidden sm:inline">SYS_TIME: {systemTime}</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              TLS 1.3
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 pt-16">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-green-500" />
            <h1
              className={`text-3xl md:text-4xl font-black tracking-wider ${glitchText ? 'text-red-500' : 'text-green-500'}`}
              style={{ textShadow: '0 0 20px rgba(0,255,0,0.5)' }}
            >
              MILLER AI GROUP
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-green-700 text-xs">
            <Terminal className="w-3 h-3" />
            <span>SECURE ACCESS TERMINAL v2.0</span>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="w-full max-w-md">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-green-900/20 border border-green-900/50 border-b-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-green-600 text-xs ml-2">auth@miller-ai</span>
            </div>
            <div className="text-green-700 text-xs">
              <Eye className="w-3 h-3 inline mr-1" />
              MONITORED
            </div>
          </div>

          {/* Terminal Body */}
          <div className="border border-green-900/50 bg-black/80 backdrop-blur-sm p-6">
            {/* Command prompt */}
            <div className="text-sm mb-4 pb-4 border-b border-green-900/30">
              <span className="text-green-600">root@miller-ai</span>
              <span className="text-white">:</span>
              <span className="text-blue-400">~/auth</span>
              <span className="text-white"># </span>
              <span className="text-green-400">./authenticate.sh</span>
              <span className="animate-pulse ml-1">█</span>
            </div>

            {/* Status messages */}
            <div className="text-sm mb-6 space-y-1">
              {isAuthenticated ? (
                <>
                  <p className="text-green-500">[+] Authentication successful</p>
                  <p className="text-green-500">[+] User identified: <span className="text-cyan-400">{userName}</span></p>
                  <p className="text-green-500">[+] Access level: <span className="text-red-400 font-bold">ROOT</span></p>
                  <p className="text-green-500">[+] Session initialized</p>
                  <p className="text-yellow-500 mt-2">[!] Ready to breach...</p>
                </>
              ) : (
                <>
                  <p className="text-blue-400">[*] Initializing secure connection...</p>
                  <p className="text-green-500">[+] Connection established</p>
                  <p className="text-green-500">[+] Encryption verified</p>
                  <p className="text-yellow-500">[!] Authentication required</p>
                  <p className="text-green-700 mt-2">Awaiting credentials...</p>
                </>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="text-red-500 text-sm mb-4 p-3 border border-red-900/50 bg-red-900/10">
                <p className="font-bold">[-] AUTHENTICATION FAILED</p>
                <p className="text-red-400 text-xs mt-1">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            {isAuthenticated ? (
              <button
                onClick={handleEnterSystem}
                className="w-full py-4 bg-green-500 text-black font-bold text-sm hover:bg-green-400 active:bg-green-600 transition-colors relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Terminal className="w-5 h-5" />
                  INITIALIZE BREACH SEQUENCE
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            ) : (
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="w-full py-4 bg-green-500 text-black font-bold text-sm hover:bg-green-400 active:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <Github className="w-5 h-5" />
                    <span>AUTHENTICATE VIA GITHUB</span>
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            )}

            {/* Security notice */}
            <div className="mt-4 pt-4 border-t border-green-900/30 text-center">
              <p className="text-green-800 text-xs">
                <Lock className="w-3 h-3 inline mr-1" />
                256-bit AES encrypted session
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-8 flex items-center gap-6 text-xs text-green-700">
          <div className="text-center">
            <div className="text-green-500 font-bold">24/7</div>
            <div>UPTIME</div>
          </div>
          <div className="w-px h-8 bg-green-900" />
          <div className="text-center">
            <div className="text-green-500 font-bold">443</div>
            <div>PORT</div>
          </div>
          <div className="w-px h-8 bg-green-900" />
          <div className="text-center">
            <div className="text-green-500 font-bold">HTTPS</div>
            <div>PROTOCOL</div>
          </div>
        </div>
      </div>

      {/* Bottom HUD Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-green-900/50 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-green-700">
          <div className="flex items-center gap-4">
            <span>TERMINAL: ACTIVE</span>
            <span className="hidden sm:inline">FIREWALL: ENABLED</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-500">● ONLINE</span>
            <span className="hidden sm:inline">v2.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-green-500 font-mono">Loading...</p>
      </div>
    }>
      <AudioEngineProvider>
        <LoginContent />
      </AudioEngineProvider>
    </Suspense>
  )
}

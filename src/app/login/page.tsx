'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Github, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AudioEngineProvider,
  useAudioEngine,
  CinematicTakeover,
} from '@/components/hacker-os'

// CRT scanline effect
function CRTEffect() {
  return (
    <>
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
          backgroundSize: '100% 2px',
        }}
      />
      {/* Screen flicker */}
      <div
        className="fixed inset-0 pointer-events-none z-50 animate-pulse"
        style={{
          background: 'rgba(0,255,0,0.01)',
          animation: 'flicker 0.15s infinite',
        }}
      />
      <style jsx>{`
        @keyframes flicker {
          0%, 100% { opacity: 0.97; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  )
}

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [envError, setEnvError] = useState(false)
  const [showTakeover, setShowTakeover] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('Operator')
  const [bootText, setBootText] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState<string>('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Set time on client only to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString())
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  // Boot sequence text
  useEffect(() => {
    const lines = [
      '[    0.000000] Linux version 5.15.0-miller-ai',
      '[    0.000001] Command line: BOOT_IMAGE=/vmlinuz root=/dev/sda1',
      '[    0.000002] Initializing cgroup subsys cpuset',
      '[    0.000003] Kernel command line: BOOT_IMAGE=/vmlinuz',
      '[    0.000004] Miller AI Security Module loaded',
      '[    0.000005] Awaiting authentication...',
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootText(prev => [...prev, lines[i]])
        i++
      } else {
        clearInterval(interval)
      }
    }, 150)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setEnvError(true)
    }

    try {
      const authError = searchParams.get('error')
      if (authError) {
        setError('Authentication failed. Try again.')
      }

      const takeover = searchParams.get('takeover')
      if (takeover === 'true') {
        const checkAuthAndTakeover = async () => {
          try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              setIsAuthenticated(true)
              setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Operator')
              if (audioEngine) {
                await audioEngine.initialize()
                await audioEngine.playIntroSong()
              }
              setShowTakeover(true)
            }
          } catch (err) {
            console.error('Auth check failed:', err)
          }
        }
        checkAuthAndTakeover()
      } else {
        const checkAuth = async () => {
          try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              setIsAuthenticated(true)
              setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Operator')
            }
          } catch (err) {
            console.error('Auth check failed:', err)
          }
        }
        checkAuth()
      }
    } catch (err) {
      console.error('useEffect error:', err)
    }
  }, [searchParams, audioEngine])

  const handleGitHubLogin = async () => {
    setLoading(true)
    setError(null)

    await audioEngine?.initialize()
    audioEngine?.playEffect('button_click')

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

  const handleEnterSystem = async () => {
    await audioEngine?.initialize()
    audioEngine?.playEffect('button_click')
    await audioEngine?.playIntroSong()
    setShowTakeover(true)
  }

  const handleTakeoverComplete = () => {
    audioEngine?.stopIntroSong()
    audioEngine?.startAmbient('system_idle')
    router.push('/app')
  }

  if (envError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
        <div className="text-red-500 text-sm">
          <p>[FATAL] Configuration error</p>
          <p>[FATAL] Missing environment variables</p>
        </div>
      </div>
    )
  }

  if (showTakeover) {
    return (
      <CinematicTakeover
        onComplete={handleTakeoverComplete}
        userName={userName}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono overflow-hidden">
      <CRTEffect />

      {/* Terminal container */}
      <div className="min-h-screen p-4 md:p-8">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6 text-xs text-green-600">
          <span>miller-ai v2.0</span>
          <span>{currentTime || '...'}</span>
        </div>

        {/* Boot log */}
        <div className="mb-8 text-xs text-green-700 space-y-0.5">
          {bootText.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* Main terminal */}
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-green-500 text-2xl md:text-3xl font-bold mb-2">
              MILLER AI GROUP
            </h1>
            <p className="text-green-700 text-xs">
              [ SECURE ACCESS TERMINAL ]
            </p>
          </div>

          {/* Login prompt */}
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-green-600">root@miller-ai</span>
              <span className="text-white">:</span>
              <span className="text-blue-400">~</span>
              <span className="text-white"># </span>
              <span className="text-green-400">./authenticate.sh</span>
            </div>

            <div className="border border-green-900 bg-black/50 p-6">
              <div className="text-green-400 text-sm mb-6">
                {isAuthenticated ? (
                  <>
                    <p>[+] Authentication successful</p>
                    <p>[+] User: {userName}</p>
                    <p>[+] Access level: ROOT</p>
                    <p className="mt-4 text-green-500">System ready. Press ENTER to continue.</p>
                  </>
                ) : (
                  <>
                    <p>Miller AI Group - Secure Access Terminal</p>
                    <p className="text-green-600 mt-2">Authentication required.</p>
                  </>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="text-red-500 text-sm mb-4">
                  <p>[-] ERROR: {error}</p>
                </div>
              )}

              {/* Buttons - min 44px touch target */}
              {isAuthenticated ? (
                <button
                  onClick={handleEnterSystem}
                  className="w-full min-h-[48px] py-3 bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors active:bg-green-600"
                >
                  [ ENTER SYSTEM ]
                </button>
              ) : (
                <button
                  onClick={handleGitHubLogin}
                  disabled={loading}
                  className="w-full min-h-[48px] py-3 bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:bg-green-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AUTHENTICATING...
                    </>
                  ) : (
                    <>
                      <Github className="w-5 h-5" />
                      AUTHENTICATE VIA GITHUB
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Status line */}
            <div className="text-xs text-green-700 flex items-center gap-2">
              <span className="animate-pulse">●</span>
              <span>Secure connection established | TLS 1.3 | AES-256-GCM</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-xs text-green-800 text-center">
            <p>Connection: 127.0.0.1 → miller-ai.group:443</p>
            <p className="mt-1">© 2024 Miller AI Group | All systems monitored</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono">
      <div className="text-green-500 text-sm">
        <span className="animate-pulse">█</span> Loading system...
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AudioEngineProvider>
        <LoginContent />
      </AudioEngineProvider>
    </Suspense>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Github, AlertCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AudioEngineProvider,
  useAudioEngine,
  CinematicTakeover,
} from '@/components/hacker-os'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [envError, setEnvError] = useState(false)
  const [showTakeover, setShowTakeover] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('Operator')
  const router = useRouter()
  const searchParams = useSearchParams()

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setEnvError(true)
    }

    try {
      const authError = searchParams.get('error')
      if (authError) {
        const errorMessages: Record<string, string> = {
          'auth_error': 'Authentication failed. Please try again.',
          'oauth_error': 'GitHub authentication was cancelled or failed.',
          'session_error': 'Failed to create session. Please try again.',
          'callback_error': 'Authentication callback failed. Please try again.',
          'no_code': 'No authorization code received. Please try again.',
        }
        setError(errorMessages[authError] || 'Authentication failed. Please try again.')
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
        setError(`GitHub login failed: ${error.message}`)
        setLoading(false)
        audioEngine?.playEffect('error')
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        setError('No OAuth URL returned. Check Supabase configuration.')
        setLoading(false)
        audioEngine?.playEffect('error')
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
      audioEngine?.playEffect('error')
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-red-500/30 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2 text-center font-mono">CONFIG ERROR</h2>
          <p className="text-neutral-400 text-sm text-center">
            Supabase environment variables not configured.
          </p>
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
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.7) 100%)'
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 p-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/miller" className="flex items-center gap-3">
            <span className="text-lg font-bold font-mono tracking-wider text-white">
              MILLER AI GROUP
            </span>
          </Link>
          <Link
            href="/miller"
            className="text-sm text-neutral-500 hover:text-white transition-colors font-mono"
          >
            &lt; BACK
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="min-h-screen flex items-center justify-center p-4 pt-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Main card */}
          <div className="bg-neutral-900/80 border border-white/10 rounded-lg overflow-hidden">
            {/* Terminal header */}
            <div className="bg-black px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs font-mono text-neutral-500 ml-2">root@miller-ai:~/login</span>
              <motion.span
                className="ml-auto text-xs text-green-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ● SECURE
              </motion.span>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Title */}
              <div className="text-center">
                <h1 className="text-2xl font-bold font-mono text-white mb-2">
                  ACCESS TERMINAL
                </h1>
                <p className="text-neutral-500 font-mono text-sm">
                  {isAuthenticated
                    ? `> Identity verified: ${userName}`
                    : '> Authenticate to continue'}
                </p>
              </div>

              {/* Error display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/30 rounded p-3 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-400 font-mono">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="space-y-4">
                {isAuthenticated ? (
                  <button
                    onClick={handleEnterSystem}
                    className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-mono font-bold rounded transition-all text-lg"
                  >
                    ENTER SYSTEM →
                  </button>
                ) : (
                  <button
                    onClick={handleGitHubLogin}
                    disabled={loading}
                    className="w-full py-4 bg-white hover:bg-neutral-200 text-black font-mono font-bold rounded transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        AUTHENTICATING...
                      </>
                    ) : (
                      <>
                        <Github className="w-5 h-5" />
                        LOGIN WITH GITHUB
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Status */}
              <div className="pt-4 border-t border-white/10 font-mono text-xs space-y-1">
                <p className="text-neutral-600">
                  <span className="text-green-500">[OK]</span> Connection encrypted
                </p>
                <p className="text-neutral-600">
                  <span className="text-green-500">[OK]</span> System ready
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-xs font-mono text-neutral-600">
            MILLER AI GROUP // SECURE ACCESS v2.0
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="w-8 h-8 mx-auto mb-4 border-2 border-white/20 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-neutral-500 font-mono text-sm">
          LOADING...
        </p>
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

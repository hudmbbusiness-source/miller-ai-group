'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Github, AlertCircle, Loader2, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AudioEngineProvider,
  useAudioEngine,
  SystemTakeoverSequence,
  DataStreamBackground,
  GlitchButton,
  HolographicPanel,
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
    // Check for env vars - must run client-side
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setEnvError(true)
    }

    // Check for auth errors in URL
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

    // Check if already authenticated
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsAuthenticated(true)
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Operator')
      }
    }
    checkAuth()
  }, [searchParams])

  const handleGitHubLogin = async () => {
    setLoading(true)
    setError(null)

    // Initialize audio on user interaction
    await audioEngine?.initialize()
    audioEngine?.playEffect('button_click')

    // Clear all auth state
    localStorage.clear()
    sessionStorage.clear()

    try {
      const supabase = createClient()

      // Get the OAuth URL explicitly and redirect
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
        // Redirect to GitHub
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
    setShowTakeover(true)
  }

  const handleTakeoverComplete = () => {
    audioEngine?.startAmbient('system_idle')
    router.push('/app')
  }

  if (envError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <HolographicPanel variant="default" className="w-full max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">CONFIGURATION ERROR</h2>
            <p className="text-neutral-400 text-sm mb-4">
              Supabase environment variables are not configured.
            </p>
            <div className="bg-black/50 p-4 rounded-lg text-left font-mono text-xs text-cyan-400">
              <p className="text-neutral-500 mb-2"># Required variables:</p>
              <p>NEXT_PUBLIC_SUPABASE_URL</p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
            </div>
          </div>
        </HolographicPanel>
      </div>
    )
  }

  // Show takeover sequence
  if (showTakeover) {
    return (
      <SystemTakeoverSequence
        onComplete={handleTakeoverComplete}
        userName={userName}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <DataStreamBackground intensity="medium" color="cyan" />

      {/* Scanlines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-40 p-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/miller" className="flex items-center gap-3 group">
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="absolute inset-0 bg-cyan-500/30 rounded-lg blur-lg" />
              <Image
                src="/logos/miller-ai-group.png"
                alt="Miller AI Group"
                width={40}
                height={40}
                className="relative w-10 h-10 rounded-lg"
              />
            </motion.div>
            <span className="text-lg font-bold text-cyan-400 font-mono tracking-wider">
              MILLER AI GROUP
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/miller"
              className="text-sm text-neutral-400 hover:text-cyan-400 transition-colors font-mono"
            >
              &lt; BACK
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <HolographicPanel
            variant="cyan"
            glowIntensity="high"
            header={
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">SYSTEM ACCESS</span>
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs text-neutral-400">ONLINE</span>
                </motion.div>
              </div>
            }
          >
            <div className="space-y-6">
              {/* Logo display */}
              <div className="text-center">
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 30px rgba(0, 255, 255, 0.2)',
                      '0 0 60px rgba(0, 255, 255, 0.4)',
                      '0 0 30px rgba(0, 255, 255, 0.2)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="inline-block p-4 rounded-2xl bg-black/50 border border-cyan-500/30 mb-4"
                >
                  <Image
                    src="/logos/miller-ai-group.png"
                    alt="Miller AI Group"
                    width={80}
                    height={80}
                    className="w-20 h-20"
                  />
                </motion.div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Welcome, Operator
                </h1>
                <p className="text-neutral-400 text-sm">
                  {isAuthenticated
                    ? 'Authentication verified. Ready to enter system.'
                    : 'Authenticate with GitHub to access the system.'}
                </p>
              </div>

              {/* Error display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-400">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="space-y-3">
                {isAuthenticated ? (
                  <GlitchButton
                    onClick={handleEnterSystem}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    <span className="flex items-center justify-center gap-2">
                      ENTER SYSTEM
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </span>
                  </GlitchButton>
                ) : (
                  <GlitchButton
                    onClick={handleGitHubLogin}
                    disabled={loading}
                    loading={loading}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    AUTHENTICATE WITH GITHUB
                  </GlitchButton>
                )}

                {!isAuthenticated && (
                  <p className="text-center text-xs text-neutral-500 font-mono">
                    SECURE AUTHENTICATION REQUIRED
                  </p>
                )}
              </div>

              {/* Terminal-style status */}
              <div className="pt-4 border-t border-white/5">
                <div className="font-mono text-xs space-y-1">
                  <p className="text-neutral-500">
                    <span className="text-cyan-400">[SYS]</span> Connection secure
                  </p>
                  <p className="text-neutral-500">
                    <span className="text-green-400">[NET]</span> Latency: 24ms
                  </p>
                  <p className="text-neutral-500">
                    <span className="text-purple-400">[AUTH]</span>{' '}
                    {isAuthenticated ? 'Verified' : 'Awaiting credentials'}
                  </p>
                </div>
              </div>
            </div>
          </HolographicPanel>

          {/* Partner logos */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex items-center justify-center gap-8"
          >
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-black/50 border border-purple-500/30 p-2 flex items-center justify-center">
                <Image
                  src="/logos/cozyfilmz.png"
                  alt="CozyFilmz"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 font-mono">COZYFILMZ</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-black/50 border border-amber-500/30 p-2 flex items-center justify-center">
                <Image
                  src="/logos/arcene.png"
                  alt="Arcene Studios"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 font-mono">ARCENE</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="fixed bottom-0 left-0 right-0 p-4 text-center"
      >
        <p className="text-xs text-neutral-600 font-mono">
          © {new Date().getFullYear()} MILLER AI GROUP | SECURE SYSTEM v2.0
        </p>
      </motion.footer>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full"
      />
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

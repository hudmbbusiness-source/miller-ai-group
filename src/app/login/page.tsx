'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Github, AlertCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AudioEngineProvider,
  useAudioEngine,
  CinematicTakeover,
  NeonDataStreams,
  HolographicGrid,
  GlitchButton,
  HolographicPanel,
  EncryptedGlyphs,
  WireframeLogo,
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

    // Check if coming back from successful auth - trigger takeover
    const takeover = searchParams.get('takeover')
    if (takeover === 'true') {
      const checkAuthAndTakeover = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setIsAuthenticated(true)
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Operator')
          // Initialize and start intro song for the cinematic experience
          await audioEngine?.initialize()
          await audioEngine?.playIntroSong()
          // Auto-trigger takeover after successful GitHub auth
          setShowTakeover(true)
        }
      }
      checkAuthAndTakeover()
    } else {
      // Normal auth check
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
    // Start the intro song
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

  // Show full cinematic takeover sequence
  if (showTakeover) {
    return (
      <CinematicTakeover
        onComplete={handleTakeoverComplete}
        userName={userName}
        initialStage="enter-system"
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Premium background effects */}
      <NeonDataStreams intensity={0.8} speed={0.8} colors={['#ff00ff', '#9d00ff', '#ffd700']} />
      <HolographicGrid color="#ff00ff" perspective={false} animated />

      {/* Scanlines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.03) 2px, rgba(255,0,255,0.03) 4px)',
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
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255,0,255,0.3)',
                  '0 0 40px rgba(255,0,255,0.5)',
                  '0 0 20px rgba(255,0,255,0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative rounded-xl overflow-hidden"
            >
              <Image
                src="/logos/miller-ai-group.png"
                alt="Miller AI Group"
                width={40}
                height={40}
                className="relative w-10 h-10 rounded-lg"
              />
            </motion.div>
            <span className="text-lg font-bold font-mono tracking-wider text-fuchsia-400">
              MILLER AI GROUP
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/miller"
              className="text-sm text-neutral-400 hover:text-fuchsia-400 transition-colors font-mono"
            >
              &lt; BACK
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-lg relative"
        >
          {/* Outer glow effect */}
          <motion.div
            className="absolute -inset-4 rounded-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,0,255,0.3) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Main card */}
          <div
            className="relative rounded-2xl border backdrop-blur-xl overflow-hidden"
            style={{
              borderColor: 'rgba(255,0,255,0.2)',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(20,0,30,0.9) 100%)',
              boxShadow: '0 0 60px rgba(255,0,255,0.1), inset 0 1px 0 rgba(255,0,255,0.1)',
            }}
          >
            {/* Header line */}
            <motion.div
              className="h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #ff00ff, #9d00ff, #ff00ff, transparent)' }}
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />

            {/* Status bar */}
            <div className="px-6 py-3 border-b border-fuchsia-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-fuchsia-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-xs font-mono text-fuchsia-400">SECURE ACCESS TERMINAL</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                v3.0.0
              </span>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Logo section */}
              <div className="text-center">
                <motion.div
                  className="relative w-32 h-32 mx-auto mb-6"
                  animate={{
                    boxShadow: [
                      '0 0 40px rgba(255,0,255,0.2)',
                      '0 0 80px rgba(255,0,255,0.4)',
                      '0 0 40px rgba(255,0,255,0.2)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <WireframeLogo size={128} color="#ff00ff" rotationSpeed={15} />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Image
                      src="/logos/miller-ai-group.png"
                      alt="Miller AI Group"
                      width={50}
                      height={50}
                      className="rounded-lg"
                      style={{ filter: 'drop-shadow(0 0 15px rgba(255,0,255,0.5))' }}
                    />
                  </motion.div>
                </motion.div>

                <motion.h1
                  className="text-3xl font-bold font-mono mb-3"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 30px rgba(255,0,255,0.6)',
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <EncryptedGlyphs text="ACCESS TERMINAL" decrypted />
                </motion.h1>

                <motion.p
                  className="text-neutral-400 font-mono text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {isAuthenticated
                    ? `Identity verified: ${userName}`
                    : 'Authenticate to access Miller AI Group OS'}
                </motion.p>
              </div>

              {/* Error display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-400 font-mono">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="space-y-4">
                {isAuthenticated ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <GlitchButton
                      onClick={handleEnterSystem}
                      variant="primary"
                      size="lg"
                      className="w-full text-lg py-5"
                    >
                      <span className="flex items-center justify-center gap-3">
                        <motion.span
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ◈
                        </motion.span>
                        ENTER SYSTEM
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          →
                        </motion.span>
                      </span>
                    </GlitchButton>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <GlitchButton
                      onClick={handleGitHubLogin}
                      disabled={loading}
                      loading={loading}
                      variant="primary"
                      size="lg"
                      className="w-full text-lg py-5"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          AUTHENTICATING...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-3">
                          <Github className="w-5 h-5" />
                          AUTHENTICATE WITH GITHUB
                        </span>
                      )}
                    </GlitchButton>
                  </motion.div>
                )}

                {!isAuthenticated && (
                  <p className="text-center text-xs text-neutral-500 font-mono">
                    SECURE GITHUB OAUTH 2.0 AUTHENTICATION
                  </p>
                )}
              </div>

              {/* Terminal status */}
              <div className="pt-4 border-t border-fuchsia-500/10">
                <div className="font-mono text-[11px] space-y-1.5">
                  <motion.p
                    className="flex items-center gap-2"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-fuchsia-400">[SYSTEM]</span>
                    <span className="text-neutral-400">Connection encrypted • AES-256</span>
                  </motion.p>
                  <motion.p
                    className="flex items-center gap-2"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  >
                    <span className="text-green-400">[STATUS]</span>
                    <span className="text-neutral-400">
                      {isAuthenticated ? 'Ready for system entry' : 'Awaiting authentication'}
                    </span>
                  </motion.p>
                  <motion.p
                    className="flex items-center gap-2"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  >
                    <span className="text-purple-400">[SECURE]</span>
                    <span className="text-neutral-400">All operatives standing by</span>
                  </motion.p>
                </div>
              </div>
            </div>

            {/* Bottom scan line */}
            <motion.div
              className="h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, #ff00ff, transparent)' }}
              initial={{ left: 0, right: '100%' }}
              animate={{ left: ['0%', '100%'], right: ['100%', '0%'] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>

          {/* Partner & Product logos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10"
          >
            {/* Partners Row */}
            <p className="text-[10px] text-neutral-600 text-center mb-3 font-mono uppercase tracking-wider">
              Partners
            </p>
            <div className="flex items-center justify-center gap-6 mb-6">
              <motion.div
                className="text-center"
                whileHover={{ scale: 1.1 }}
              >
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
              </motion.div>
              <motion.div
                className="text-center"
                whileHover={{ scale: 1.1 }}
              >
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
              </motion.div>
            </div>

            {/* Products Row */}
            <p className="text-[10px] text-fuchsia-500 text-center mb-3 font-mono uppercase tracking-wider">
              Products
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {[
                { name: 'KACHOW', icon: '/logos/kachow.png', color: 'fuchsia' },
                { name: 'STUNTMAN', emoji: '🎬', color: 'red' },
                { name: 'BRAINBOX', emoji: '🧠', color: 'purple' },
                { name: 'CODE', emoji: '💻', color: 'green' },
              ].map((product) => (
                <motion.div
                  key={product.name}
                  className="text-center"
                  whileHover={{ scale: 1.1, y: -2 }}
                >
                  <div
                    className="w-9 h-9 mx-auto rounded-lg bg-black/50 border p-1.5 flex items-center justify-center"
                    style={{
                      borderColor: product.color === 'fuchsia' ? 'rgba(255,0,255,0.3)' :
                                   product.color === 'red' ? 'rgba(239,68,68,0.3)' :
                                   product.color === 'purple' ? 'rgba(168,85,247,0.3)' :
                                   'rgba(0,255,65,0.3)'
                    }}
                  >
                    {product.icon ? (
                      <Image
                        src={product.icon}
                        alt={product.name}
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain"
                      />
                    ) : (
                      <span className="text-xs">{product.emoji}</span>
                    )}
                  </div>
                  <p
                    className="text-[9px] mt-1 font-mono"
                    style={{
                      color: product.color === 'fuchsia' ? '#ff00ff' :
                             product.color === 'red' ? '#ef4444' :
                             product.color === 'purple' ? '#a855f7' :
                             '#00ff41'
                    }}
                  >
                    {product.name}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-8"
          >
            <p className="text-xs font-mono text-fuchsia-500/50">
              © {new Date().getFullYear()} MILLER AI GROUP • SECURE ACCESS v3.0
            </p>
          </motion.div>
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
          className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-fuchsia-500/30"
          style={{
            borderTopColor: '#ff00ff',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.p
          className="text-fuchsia-400 font-mono text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          INITIALIZING SYSTEM...
        </motion.p>
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

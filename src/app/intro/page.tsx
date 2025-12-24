'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertCircle, DollarSign, Github, Loader2, ArrowRight } from 'lucide-react'

export default function IntroPage() {
  const [videoEnded, setVideoEnded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const HOLD_DURATION = 3000 // 3 seconds
  const UPDATE_INTERVAL = 50 // Update every 50ms

  useEffect(() => {
    // Always show login button - don't auto-detect sessions
    setAuthChecking(false)
    setIsAuthenticated(false)
  }, [])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current)
      }
    }
  }, [])

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true)
  }, [])

  const handleVideoError = useCallback(() => {
    setVideoError(true)
    setVideoEnded(true)
  }, [])

  const handleEnter = () => {
    if (isAuthenticated) {
      router.push('/app')
    } else {
      // Not authenticated - trigger login
      handleGitHubLogin()
    }
  }

  const handleGitHubLogin = async () => {
    setLoginLoading(true)
    setLoginError(null)

    // Clear all auth state
    localStorage.removeItem('miller-ai-group-access-verified')
    localStorage.removeItem('sb-mrmynzeymwgzevxyxnln-auth-token')
    sessionStorage.clear()

    try {
      const supabase = createClient()

      // Sign out any existing session first
      await supabase.auth.signOut()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      })

      if (error) {
        setLoginError(`GitHub login failed: ${error.message}`)
        setLoginLoading(false)
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        setLoginError('No redirect URL from Supabase. Verify GitHub provider is enabled in Supabase dashboard.')
        setLoginLoading(false)
      }
    } catch (err) {
      setLoginError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoginLoading(false)
    }
  }

  const skipVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setVideoEnded(true)
  }, [])

  const startHold = useCallback(() => {
    if (videoEnded) return

    setIsHolding(true)
    setHoldProgress(0)

    let progress = 0
    holdIntervalRef.current = setInterval(() => {
      progress += (UPDATE_INTERVAL / HOLD_DURATION) * 100
      setHoldProgress(progress)

      if (progress >= 100) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current)
        }
        skipVideo()
      }
    }, UPDATE_INTERVAL)
  }, [videoEnded, skipVideo])

  const endHold = useCallback(() => {
    setIsHolding(false)
    setHoldProgress(0)
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Video Background */}
      {!videoError && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          preload="auto"
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          style={{ pointerEvents: 'none' }}
        >
          <source src="/intro-video.mp4" type="video/mp4" />
        </video>
      )}

      {/* Error Banner */}
      {videoError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Intro video asset missing</span>
        </motion.div>
      )}

      {/* Premium Fallback Background */}
      {videoError && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent" />
        </div>
      )}

      {/* Skip Button - Hold to Skip */}
      <AnimatePresence>
        {!videoEnded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute bottom-8 right-8 z-30"
          >
            <div className="relative">
              <button
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                className={`
                  relative px-6 py-3 rounded-full font-bold text-sm
                  overflow-hidden
                  bg-gradient-to-r from-green-500 to-emerald-600
                  text-white shadow-lg shadow-green-500/30
                  transition-all duration-200
                  ${isHolding ? 'scale-95' : 'hover:scale-105'}
                  flex items-center gap-2
                `}
              >
                {/* Darkening overlay that fills from left to right */}
                <div
                  className="absolute inset-0 bg-black/60 origin-left transition-transform duration-100 ease-linear"
                  style={{
                    transform: `scaleX(${holdProgress / 100})`,
                  }}
                />
                {/* Button content */}
                <DollarSign className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Get Rich$</span>
              </button>

              {/* Hold instruction */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: isHolding ? 1 : 0.7 }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/60 whitespace-nowrap"
              >
                {isHolding ? `${Math.ceil((100 - holdProgress) / 33.3)}s...` : 'Hold 3s to skip'}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enter Buttons */}
      <AnimatePresence>
        {videoEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center space-y-4"
            >
              {authChecking ? (
                // Still checking auth state
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <p className="text-white/70">Checking authentication...</p>
                </div>
              ) : isAuthenticated ? (
                // Already logged in - go to dashboard
                <Button
                  onClick={() => router.push('/app')}
                  size="lg"
                  className="px-12 py-6 text-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 transition-all duration-300 shadow-2xl hover:shadow-amber-500/30 hover:scale-105"
                >
                  Enter Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                // Not logged in - show login options
                <div className="flex flex-col items-center gap-4">
                  {loginError && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 max-w-md">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{loginError}</span>
                    </div>
                  )}
                  <Button
                    onClick={handleGitHubLogin}
                    disabled={loginLoading}
                    size="lg"
                    className="px-12 py-6 text-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 transition-all duration-300 shadow-2xl hover:shadow-amber-500/30 hover:scale-105"
                  >
                    {loginLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Github className="w-5 h-5 mr-2" />
                    )}
                    {loginLoading ? 'Redirecting to GitHub...' : 'Login with GitHub'}
                  </Button>
                  <Button
                    onClick={() => router.push('/resume')}
                    variant="ghost"
                    size="lg"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    View Public Portfolio
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

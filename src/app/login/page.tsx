'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Github, Loader2, Shield, ArrowRight, Sparkles, Lock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auth check effect
  useEffect(() => {
    if (!mounted) return

    const authError = searchParams.get('error')
    if (authError) {
      setError('Authentication failed. Please try again.')
    }

    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // If coming back from OAuth, go directly to app
        const takeover = searchParams.get('takeover')
        if (takeover === 'true') {
          router.push('/app')
          return
        }
        setIsAuthenticated(true)
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User')
      }
    }
    checkAuth()
  }, [mounted, searchParams, router])

  const handleGitHubLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      })

      if (error) {
        setError(error.message)
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
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handleEnterSystem = () => {
    router.push('/app')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Grid background */}
      <div
        className="fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/miller" className="flex items-center gap-3">
              <Image
                src="/logos/miller-ai-group.svg"
                alt="Miller AI Group"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="font-semibold text-white">Miller AI Group</span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Lock className="w-4 h-4" />
              <span>Secure Login</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-3xl blur-xl" />

            <div className="relative rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-6 shadow-lg shadow-violet-500/25"
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {isAuthenticated ? `Welcome back, ${userName}` : 'Sign in to Miller AI'}
                </h1>
                <p className="text-neutral-400 text-sm">
                  {isAuthenticated
                    ? 'Your session is active. Ready to continue?'
                    : 'Access your dashboard and AI tools'}
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Actions */}
              {isAuthenticated ? (
                <motion.button
                  onClick={handleEnterSystem}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full relative group overflow-hidden rounded-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2 py-4 text-white font-semibold">
                    Enter Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleGitHubLogin}
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-white text-black font-semibold hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Github className="w-5 h-5" />
                      <span>Continue with GitHub</span>
                    </>
                  )}
                </motion.button>
              )}

              {/* Divider */}
              {!isAuthenticated && (
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-neutral-900 text-xs text-neutral-500">
                      Secure authentication via GitHub
                    </span>
                  </div>
                </div>
              )}

              {/* Features */}
              {!isAuthenticated && (
                <div className="space-y-3">
                  {[
                    'Access AI-powered tools and analytics',
                    'Manage your projects and workspace',
                    'Connect with the Miller AI ecosystem',
                  ].map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="flex items-center gap-3 text-sm text-neutral-400"
                    >
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                      </div>
                      {feature}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-500">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-violet-400 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom accent */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-8 h-8 text-violet-500" />
        </motion.div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

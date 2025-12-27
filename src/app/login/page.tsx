'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Github, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [envError, setEnvError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for env vars - must run client-side
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(errorMessages[authError] || 'Authentication failed. Please try again.')
    }
    // Don't auto-redirect - always show login page
  }, [searchParams])

  const handleGitHubLogin = async () => {
    setLoading(true)
    setError(null)

    // Clear all auth state
    localStorage.clear()
    sessionStorage.clear()

    try {
      const supabase = createClient()

      // Get the OAuth URL explicitly and redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/app/launch-pad`,
          skipBrowserRedirect: true, // Get URL to redirect manually
        },
      })

      if (error) {
        setError(`GitHub login failed: ${error.message}`)
        setLoading(false)
        return
      }

      if (data?.url) {
        // Redirect to GitHub
        window.location.href = data.url
      } else {
        setError('No OAuth URL returned. Check Supabase configuration.')
        setLoading(false)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  if (envError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Configuration Error</CardTitle>
            <CardDescription>
              Supabase environment variables are not configured. Please check your .env.local file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg text-sm font-mono">
              <p>Required variables:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5 flex items-center justify-center p-4">
      {/* Subtle amber glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-amber-500/20 shadow-2xl shadow-amber-500/5">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <CardTitle className="text-3xl font-bold tracking-tight">
                Miller AI Group
              </CardTitle>
            </motion.div>
            <CardDescription className="text-muted-foreground">
              Sign in with GitHub to access your private hub
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <Button
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500"
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Github className="w-5 h-5 mr-2" />
              )}
              Continue with GitHub
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Secure authentication
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              GitHub authentication is required to access this private workspace.
            </p>

            <div className="pt-4 border-t border-border">
              <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-amber-500 transition-colors">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}

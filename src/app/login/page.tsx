'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Github, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AudioEngineProvider,
  useAudioEngine,
  CinematicTakeover,
} from '@/components/hacker-os'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTakeover, setShowTakeover] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('Operator')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  // Only render dynamic content after mount to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

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
          await audioEngine?.initialize()
          await audioEngine?.playIntroSong()
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

  if (showTakeover) {
    return (
      <CinematicTakeover
        onComplete={handleTakeoverComplete}
        userName={userName}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-6">
      {/* Header */}
      <div className="max-w-md mx-auto pt-20">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
          MILLER AI GROUP
        </h1>
        <p className="text-green-700 text-xs text-center mb-12">
          [ SECURE ACCESS TERMINAL ]
        </p>

        {/* Terminal box */}
        <div className="border border-green-900 bg-black p-6">
          <div className="text-sm mb-6">
            <span className="text-green-600">root@miller-ai</span>
            <span className="text-white">:</span>
            <span className="text-blue-400">~</span>
            <span className="text-white"># </span>
            <span className="text-green-400">./authenticate.sh</span>
          </div>

          <div className="text-green-400 text-sm mb-6">
            {isAuthenticated ? (
              <>
                <p>[+] Authentication successful</p>
                <p>[+] User: {userName}</p>
                <p>[+] Access level: ROOT</p>
              </>
            ) : (
              <>
                <p>Miller AI Group - Secure Access Terminal</p>
                <p className="text-green-600 mt-2">Authentication required.</p>
              </>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm mb-4">
              [-] ERROR: {error}
            </div>
          )}

          {isAuthenticated ? (
            <button
              onClick={handleEnterSystem}
              className="w-full py-4 bg-green-500 text-black font-bold text-sm hover:bg-green-400 active:bg-green-600"
            >
              [ ENTER SYSTEM ]
            </button>
          ) : (
            <button
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full py-4 bg-green-500 text-black font-bold text-sm hover:bg-green-400 active:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* Footer */}
        <p className="text-green-800 text-xs text-center mt-8">
          Secure connection | TLS 1.3
        </p>
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

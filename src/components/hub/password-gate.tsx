'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'

const CORRECT_PASSWORD = 'RiskIt-2004'
const STORAGE_KEY = 'miller-ai-group-access-verified'

interface PasswordGateProps {
  children: React.ReactNode
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if user has already verified
    // This must run client-side after mount (localStorage not available in SSR)
    const verified = localStorage.getItem(STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsVerified(verified === 'true')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 300))

    if (password === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setIsVerified(true)
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  // Still loading - show nothing to prevent flash
  if (isVerified === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Verified - show children
  if (isVerified) {
    return <>{children}</>
  }

  // Not verified - show password gate with dimmed background
  return (
    <div className="relative min-h-screen">
      {/* Dimmed app content in background */}
      <div className="opacity-20 blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Password modal overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Card className="w-full max-w-md border-amber-500/20 shadow-2xl shadow-amber-500/10">
              <CardHeader className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Private System</CardTitle>
                  <CardDescription className="mt-2">
                    This is a private system. Enter password to continue.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
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

                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-12 pr-12 text-base"
                      autoFocus
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !password}
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500"
                  >
                    {isLoading ? 'Verifying...' : 'Continue'}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground">
                  Contact the administrator if you need access credentials
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, ArrowLeft, Loader2 } from 'lucide-react'

export default function UnlockPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/app/launch-pad'

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Set the password cookie
    document.cookie = `site_access=${password}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days

    // Try to access the redirect URL
    try {
      const res = await fetch(redirect, { method: 'HEAD' })
      if (res.redirected && res.url.includes('/unlock')) {
        // Password was wrong, we got redirected back
        setError('Incorrect password')
        setLoading(false)
      } else {
        // Password was correct, navigate
        router.push(redirect)
      }
    } catch {
      // Just try navigating
      router.push(redirect)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logos/miller-ai-group.svg"
              alt="Miller AI Group"
              width={36}
              height={36}
              className="w-9 h-9"
            />
            <span className="font-bold text-lg">Miller AI Group</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Private Access</CardTitle>
            <CardDescription>
              This area requires a password to access. Enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading || !password}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Unlock
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-6">
              This is a private workspace. Contact the owner for access.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

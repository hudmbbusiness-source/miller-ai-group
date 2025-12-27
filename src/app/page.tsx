'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Zap,
  ArrowRight,
  Check,
  Loader2,
  ChevronDown,
  Scissors,
  Volume2,
  Type,
  Film,
  Brain,
  LineChart,
  X,
  Clock,
} from 'lucide-react'

function KachowLandingContent() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showSignup, setShowSignup] = useState(false)
  const [isProcessingAuth, setIsProcessingAuth] = useState(false)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const router = useRouter()
  const searchParams = useSearchParams()
  // 24-hour countdown that resets at midnight
  useEffect(() => {
    const calculateTimeToMidnight = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ hours, minutes, seconds })
    }

    calculateTimeToMidnight()
    const interval = setInterval(calculateTimeToMidnight, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && !isProcessingAuth) {
      setIsProcessingAuth(true)
      const exchangeCode = async () => {
        try {
          const supabase = createClient()
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            router.push('/login?error=session_error')
          } else if (data.session) {
            router.push('/app')
          }
        } catch {
          router.push('/login?error=callback_error')
        }
      }
      exchangeCode()
    }
  }, [searchParams, router, isProcessingAuth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, accessCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitStatus('error')
        setErrorMessage(data.error || 'Something went wrong')
      } else {
        setSubmitStatus('success')
        setEmail('')
        setFullName('')
        setAccessCode('')
      }
    } catch {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const capabilities = [
    {
      icon: Brain,
      title: 'Viral Content Analysis',
      description: 'Scans trending YouTube content to understand what the algorithm is currently favoring.',
    },
    {
      icon: Scissors,
      title: 'Automated Clip Editing',
      description: 'Identifies optimal cut points, hooks, and pacing based on viral content patterns.',
    },
    {
      icon: Volume2,
      title: 'Audio Optimization',
      description: 'Matches trending audio styles, music beds, and sound design to your content.',
    },
    {
      icon: Film,
      title: 'B-Roll Integration',
      description: 'Suggests and integrates b-roll footage that aligns with high-performing formats.',
    },
    {
      icon: Type,
      title: 'Caption Generation',
      description: 'Creates captions with styles and animations that drive viewer retention.',
    },
    {
      icon: LineChart,
      title: 'Algorithm Alignment',
      description: 'Every edit decision is guided by real algorithm data, not subjective preferences.',
    },
  ]

  const formatTime = (num: number) => num.toString().padStart(2, '0')

  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Signing in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800/50 bg-black/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logos/kachow.png"
                alt="Kachow"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-lg font-semibold tracking-tight">Kachow</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#capabilities" className="text-sm text-neutral-400 hover:text-white transition-colors">
                Capabilities
              </a>
              <a href="#early-access" className="text-sm text-neutral-400 hover:text-white transition-colors">
                Early Access
              </a>
              <Link href="/miller" className="text-sm text-neutral-400 hover:text-white transition-colors">
                Miller AI Group
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:block text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <button
                onClick={() => setShowSignup(true)}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors"
              >
                Get Early Access
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">Coming 2026</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
              AI Video Editing
              <br />
              <span className="text-neutral-500">Built for Monetization</span>
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Kachow analyzes what&apos;s working on YouTube right now and applies those patterns
              to your content. We&apos;re building editing software designed to help creators
              reach YouTube Partner Program requirements and earn revenue.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowSignup(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors"
              >
                Join Early Access
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#capabilities"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-neutral-800 text-white font-medium hover:bg-neutral-900 transition-colors"
              >
                Learn More
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-5 h-5 text-neutral-600" />
          </motion.div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-24 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6">
                Edit for the algorithm,
                <br />
                <span className="text-neutral-500">not for aesthetics</span>
              </h2>
              <div className="space-y-4 text-neutral-400">
                <p>
                  Most editing tools optimize for how videos look. Kachow will optimize
                  for how videos perform.
                </p>
                <p>
                  By analyzing real-time data from trending content, we&apos;re building
                  an AI that understands what the YouTube algorithm rewards—and applies
                  those patterns to your edits automatically.
                </p>
                <p>
                  The goal: help you hit monetization thresholds faster and build a
                  sustainable income from your content.
                </p>
              </div>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
              <h3 className="text-lg font-medium mb-6">What we&apos;re building</h3>
              <ul className="space-y-4">
                {[
                  'Real-time analysis of viral YouTube content',
                  'AI-powered editing that mirrors successful patterns',
                  'Automated audio, cuts, b-roll, and captions',
                  'Focus on retention metrics that drive monetization',
                  'Tools designed around YPP requirements',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-amber-500" />
                    </div>
                    <span className="text-neutral-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="py-24 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              Planned Capabilities
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Features we&apos;re developing to help creators produce algorithm-friendly content.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-base font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access */}
      <section id="early-access" className="py-24 border-t border-neutral-900">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 mb-6">
            <Zap className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium text-green-500 uppercase tracking-wide">Early Access</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
            Get free lifetime access
          </h2>
          <p className="text-neutral-400 mb-6">
            Early supporters will receive free access when we launch.
            Standard pricing will be $23.99/month.
          </p>

          {/* Countdown Timer */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 mb-3">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Limited Time Offer</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 min-w-[70px]">
                <div className="text-2xl font-bold text-white font-mono">{formatTime(countdown.hours)}</div>
                <div className="text-xs text-neutral-500 uppercase">Hours</div>
              </div>
              <span className="text-2xl text-neutral-600 font-bold">:</span>
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 min-w-[70px]">
                <div className="text-2xl font-bold text-white font-mono">{formatTime(countdown.minutes)}</div>
                <div className="text-xs text-neutral-500 uppercase">Minutes</div>
              </div>
              <span className="text-2xl text-neutral-600 font-bold">:</span>
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 min-w-[70px]">
                <div className="text-2xl font-bold text-white font-mono">{formatTime(countdown.seconds)}</div>
                <div className="text-xs text-neutral-500 uppercase">Seconds</div>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-3">Offer resets daily at midnight</p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-4xl font-semibold">$0</span>
              <span className="text-neutral-500 line-through">$23.99/mo</span>
            </div>
            <p className="text-sm text-amber-500 mb-8">Forever free with early access code</p>

            <ul className="space-y-3 text-left mb-8">
              {[
                'Full access to all features at launch',
                'Priority support',
                'All future updates included',
                'No credit card required',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm text-neutral-300">{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowSignup(true)}
              className="w-full py-3 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors"
            >
              Claim Your Spot
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logos/kachow.png"
                alt="Kachow"
                width={24}
                height={24}
                className="w-6 h-6 rounded"
              />
              <span className="text-sm text-neutral-400">Kachow by Miller AI Group</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/miller" className="hover:text-white transition-colors">About</Link>
              <Link href="/login" className="hover:text-white transition-colors">Launch Pad</Link>
            </div>

            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} Miller AI Group
            </p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      <AnimatePresence>
        {showSignup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
              onClick={() => setShowSignup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/logos/kachow.png"
                      alt="Kachow"
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-lg"
                    />
                    <div>
                      <h3 className="font-semibold">Early Access</h3>
                      <p className="text-xs text-neutral-500">Free lifetime access</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSignup(false)}
                    className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>

                {/* Countdown in modal */}
                <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">
                    Offer expires in {formatTime(countdown.hours)}:{formatTime(countdown.minutes)}:{formatTime(countdown.seconds)}
                  </span>
                </div>

                {submitStatus === 'success' ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-7 h-7 text-green-500" />
                    </div>
                    <h4 className="text-lg font-semibold mb-2">You&apos;re on the list</h4>
                    <p className="text-sm text-neutral-400 mb-6">
                      We&apos;ll notify you when Kachow is ready to launch.
                    </p>
                    <button
                      onClick={() => {
                        setShowSignup(false)
                        setSubmitStatus('idle')
                      }}
                      className="text-sm text-amber-500 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-neutral-300 mb-1.5">
                        Name <span className="text-neutral-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="accessCode" className="block text-sm font-medium text-neutral-300 mb-1.5">
                        Access Code
                      </label>
                      <input
                        type="text"
                        id="accessCode"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="Enter your code"
                        required
                        className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                      <p className="mt-1.5 text-xs text-neutral-500">
                        Share our Instagram post to receive a code.
                      </p>
                    </div>

                    {submitStatus === 'error' && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Join Early Access'
                      )}
                    </button>

                    <p className="text-center text-xs text-neutral-500">
                      By signing up, you agree to our{' '}
                      <Link href="/terms" className="text-amber-500 hover:underline">Terms</Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-amber-500 hover:underline">Privacy Policy</Link>
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
    </div>
  )
}

export default function KachowLandingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KachowLandingContent />
    </Suspense>
  )
}

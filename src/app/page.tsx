'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Zap,
  Youtube,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  ChevronDown,
  Play,
  BarChart3,
  Clock,
  Target,
  Brain,
  Wand2,
  MessageSquare,
  X,
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
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle OAuth redirects
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

  const features = [
    {
      icon: Youtube,
      title: 'YouTube Integration',
      description: 'Connect directly with YouTube to analyze trends, optimize content, and grow your channel faster.',
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get intelligent recommendations based on real-time data analysis and proven growth strategies.',
    },
    {
      icon: TrendingUp,
      title: 'Growth Analytics',
      description: 'Track your performance with detailed analytics and actionable insights to maximize your reach.',
    },
    {
      icon: Wand2,
      title: 'Content Optimization',
      description: 'Optimize titles, descriptions, and thumbnails with AI suggestions that drive clicks.',
    },
    {
      icon: Clock,
      title: 'Save Hours Weekly',
      description: 'Automate research and analysis tasks that would normally take hours of manual work.',
    },
    {
      icon: Target,
      title: 'Audience Targeting',
      description: 'Understand your audience better and create content that resonates and converts.',
    },
  ]

  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-zinc-400">Completing login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/kachow.png"
                alt="Kachow AI"
                width={40}
                height={40}
                className="w-10 h-10 rounded-xl"
              />
              <span className="text-xl font-bold tracking-tight">Kachow</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Pricing
              </a>
              <Link href="/miller" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Miller AI Group
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
              >
                Get Early Access
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[128px]" />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-zinc-300">AI-Powered Content Growth</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
              <span className="block">Grow Your</span>
              <span className="block bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                YouTube Channel
              </span>
              <span className="block">With AI</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-400 mb-10 leading-relaxed">
              Kachow AI analyzes trends, optimizes content, and provides actionable insights
              to help creators grow faster. Join the future of content creation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={() => setShowSignup(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold px-8 py-4 rounded-xl text-lg hover:from-amber-400 hover:to-amber-500 transition-all shadow-2xl shadow-amber-500/30"
              >
                Get Free Access
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-medium px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-all"
              >
                <Play className="w-5 h-5" />
                See How It Works
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-zinc-500 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                <span>Early access members get lifetime free</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="w-6 h-6 text-zinc-600" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Everything you need to
              <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent"> grow</span>
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Powerful AI tools designed specifically for YouTube creators who want to scale their content.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-amber-500/30 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 md:py-32 border-t border-white/5 bg-gradient-to-b from-transparent to-amber-500/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-500 font-medium">Limited Time Offer</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Get lifetime free access
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Early access members get free lifetime access to all features. Normal pricing starts at $23.99/month.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-lg mx-auto"
          >
            <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
              {/* Glow Effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-500/20 via-transparent to-amber-500/20 blur-xl opacity-50" />

              <div className="relative">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-zinc-500 line-through">$23.99</span>
                  <span className="text-zinc-500">/month</span>
                </div>
                <p className="text-amber-500 font-medium mb-6">Forever free with early access code</p>

                <ul className="space-y-4 mb-8">
                  {[
                    'Full YouTube integration',
                    'Unlimited AI analysis',
                    'Content optimization tools',
                    'Growth analytics dashboard',
                    'Priority support',
                    'All future updates included',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-amber-500" />
                      </div>
                      <span className="text-zinc-300">{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowSignup(true)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold py-4 rounded-xl text-lg hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
                >
                  Claim Your Free Access
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Ready to grow your channel?
            </h2>
            <p className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto">
              Join the waitlist today and get lifetime free access when we launch. No credit card required.
            </p>
            <button
              onClick={() => setShowSignup(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold px-8 py-4 rounded-xl text-lg hover:from-amber-400 hover:to-amber-500 transition-all shadow-2xl shadow-amber-500/30"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/kachow.png"
                alt="Kachow AI"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg"
              />
              <div>
                <p className="font-medium">Kachow AI</p>
                <p className="text-sm text-zinc-500">by Miller AI Group</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/miller" className="hover:text-white transition-colors">
                About
              </Link>
            </div>

            <p className="text-sm text-zinc-500">
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowSignup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/logos/kachow.png"
                      alt="Kachow AI"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-xl"
                    />
                    <h3 className="text-xl font-bold">Get Early Access</h3>
                  </div>
                  <button
                    onClick={() => setShowSignup(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {submitStatus === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h4 className="text-xl font-semibold mb-2">You're In!</h4>
                    <p className="text-zinc-400 mb-6">
                      Check your email for confirmation. We'll notify you when Kachow AI is ready.
                    </p>
                    <button
                      onClick={() => {
                        setShowSignup(false)
                        setSubmitStatus('idle')
                      }}
                      className="text-amber-500 hover:underline"
                    >
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300 mb-2">
                        Name (optional)
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                        Email address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="accessCode" className="block text-sm font-medium text-zinc-300 mb-2">
                        Access code
                      </label>
                      <input
                        type="text"
                        id="accessCode"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="Enter your code"
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                      />
                      <p className="mt-2 text-xs text-zinc-500">
                        Don't have a code? Share our Instagram post to get yours.
                      </p>
                    </div>

                    {submitStatus === 'error' && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold py-4 rounded-xl text-lg hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Claim Free Access
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-zinc-500">
                      By signing up, you agree to our{' '}
                      <Link href="/terms" className="text-amber-500 hover:underline">
                        Terms
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-amber-500 hover:underline">
                        Privacy Policy
                      </Link>
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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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

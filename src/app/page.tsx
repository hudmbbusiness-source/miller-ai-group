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
  DollarSign,
  BarChart3,
  Scissors,
  Volume2,
  Type,
  Film,
  Target,
  Brain,
  LineChart,
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

  const editingFeatures = [
    {
      icon: Brain,
      title: 'Viral Pattern Analysis',
      description: 'Our AI continuously scans YouTube\'s top-performing content to identify exactly what the algorithm is pushing right now.',
    },
    {
      icon: Scissors,
      title: 'Precision Cuts',
      description: 'Auto-detects hook moments, peak engagement points, and optimal clip lengths based on what\'s currently going viral.',
    },
    {
      icon: Volume2,
      title: 'Trending Audio',
      description: 'Automatically matches your content with trending sounds, music beds, and audio patterns that the algorithm favors.',
    },
    {
      icon: Film,
      title: 'B-Roll Integration',
      description: 'Smart b-roll suggestions and overlays that match viral video formats and keep viewer retention high.',
    },
    {
      icon: Type,
      title: 'Viral Captions',
      description: 'Auto-generated captions with trending styles, animations, and timing that boost watch time and engagement.',
    },
    {
      icon: LineChart,
      title: 'Algorithm Optimization',
      description: 'Every edit decision is based on real-time algorithm data, not guesswork. We edit for the algorithm, not aesthetics.',
    },
  ]

  const stats = [
    { value: '10x', label: 'Faster Than Manual Editing' },
    { value: '47%', label: 'Higher Engagement Rate' },
    { value: '$0', label: 'Cost vs $23.99/mo' },
  ]

  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030303]/90 backdrop-blur-xl border-b border-white/5">
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
              <div>
                <span className="text-xl font-bold tracking-tight">Kachow</span>
                <span className="hidden sm:inline text-xs text-zinc-500 ml-2">by Miller AI Group</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Pricing
              </a>
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
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25"
              >
                Get Free Access
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[150px]" />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-8">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-400 font-medium">Built for YouTube Monetization</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              <span className="block text-white">Edit for the</span>
              <span className="block bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent py-2">
                Algorithm
              </span>
              <span className="block text-white">Not the Creator</span>
            </h1>

            <p className="max-w-3xl mx-auto text-lg sm:text-xl text-zinc-400 mb-6 leading-relaxed">
              World-class AI that analyzes YouTube's viral content in real-time and auto-edits your clips
              with trending audio, precision cuts, b-roll, and captions—all optimized for what the algorithm
              wants, not what looks pretty.
            </p>

            <p className="max-w-2xl mx-auto text-base sm:text-lg text-amber-500/90 font-medium mb-10">
              Other tools edit for satisfaction. We edit for <span className="text-amber-400">monetization</span>.
              <br className="hidden sm:block" />
              Get paid through the YouTube Partner Program.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={() => setShowSignup(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold px-8 py-4 rounded-xl text-lg hover:from-amber-400 hover:to-orange-500 transition-all shadow-2xl shadow-amber-500/30"
              >
                Start Making Money
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-medium px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-all"
              >
                <Play className="w-5 h-5" />
                See How It Works
              </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
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

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32 border-t border-white/5 bg-gradient-to-b from-transparent via-amber-950/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              How <span className="text-amber-500">Kachow</span> Works
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              We don't guess what works. We analyze millions of data points from YouTube's algorithm in real-time.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Analyze Viral Content',
                description: 'Our AI scans YouTube 24/7 to identify what the algorithm is currently pushing—hook patterns, audio trends, caption styles, and pacing that drives views.',
                icon: BarChart3,
              },
              {
                step: '02',
                title: 'Auto-Edit Your Clips',
                description: 'Upload your raw footage. Kachow automatically cuts, adds trending audio, inserts b-roll, generates viral captions, and optimizes pacing for maximum retention.',
                icon: Scissors,
              },
              {
                step: '03',
                title: 'Get Paid from YPP',
                description: 'Your content is now algorithm-optimized. Watch your views climb, hit monetization thresholds faster, and start earning from the YouTube Partner Program.',
                icon: DollarSign,
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div className="absolute -top-4 -left-4 text-6xl font-bold text-amber-500/10">
                  {item.step}
                </div>
                <div className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-8 h-full hover:border-amber-500/30 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Other Editing Tools Are <span className="text-red-500">Costing You Money</span>
              </h2>
              <div className="space-y-4 text-zinc-400">
                <p className="text-lg">
                  Traditional auto-editors focus on making your videos <em>look good</em>. That's the wrong goal.
                </p>
                <p>
                  YouTube's algorithm doesn't care about aesthetics. It cares about retention, engagement patterns,
                  and format recognition. When you edit for beauty instead of the algorithm, you're leaving money on the table.
                </p>
                <ul className="space-y-3 pt-4">
                  {[
                    'Generic templates that the algorithm ignores',
                    'No understanding of current viral trends',
                    'Editing for creator preference, not viewer retention',
                    'Zero focus on monetization or YPP requirements',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-6 text-amber-400">
                  The Kachow Difference
                </h3>
                <ul className="space-y-4">
                  {[
                    'Real-time analysis of what\'s going viral RIGHT NOW',
                    'Auto-applies trending audio, cuts, and caption styles',
                    'B-roll suggestions that match current algorithm preferences',
                    'Optimized for YPP monetization thresholds',
                    'Every edit decision backed by algorithm data',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-amber-500" />
                      </div>
                      <span className="text-zinc-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 md:py-32 border-t border-white/5 bg-gradient-to-b from-transparent to-amber-950/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Algorithm-First <span className="text-amber-500">Auto-Editing</span>
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Every feature is designed to make the algorithm love your content. No fluff, just results.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {editingFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-amber-500/30 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mb-4 group-hover:from-amber-500/20 group-hover:to-orange-500/20 transition-colors">
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
      <section id="pricing" className="py-24 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-400 font-medium">Early Access Exclusive</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Free Lifetime Access
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Early supporters get free access forever. Normal pricing will be $23.99/month after launch.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-lg mx-auto"
          >
            <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10 blur-xl opacity-50" />

              <div className="relative">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-zinc-500 line-through text-xl">$23.99</span>
                  <span className="text-zinc-500">/month</span>
                </div>
                <p className="text-amber-500 font-medium mb-8">Forever free with early access code</p>

                <ul className="space-y-4 mb-8">
                  {[
                    'Full viral pattern analysis',
                    'Unlimited auto-editing',
                    'Trending audio matching',
                    'Auto b-roll suggestions',
                    'Viral caption generation',
                    'Algorithm optimization',
                    'Priority support',
                    'All future updates',
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
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold py-4 rounded-xl text-lg hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25"
                >
                  Claim Your Free Access
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 border-t border-white/5 bg-gradient-to-t from-amber-950/10 to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Stop Editing for Likes.
              <br />
              <span className="text-amber-500">Start Editing for Dollars.</span>
            </h2>
            <p className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto">
              Join creators who are using algorithm-driven editing to hit monetization faster
              and actually get paid from the YouTube Partner Program.
            </p>
            <button
              onClick={() => setShowSignup(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold px-10 py-5 rounded-xl text-lg hover:from-amber-400 hover:to-orange-500 transition-all shadow-2xl shadow-amber-500/30"
            >
              Get Free Access Now
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
                <p className="font-semibold">Kachow AI</p>
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
                    <div>
                      <h3 className="text-xl font-bold">Get Free Access</h3>
                      <p className="text-sm text-zinc-500">Lifetime access, no credit card</p>
                    </div>
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
                      Check your email for confirmation. We'll notify you when Kachow AI is ready to help you start earning.
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
                        Share our Instagram post to get your access code.
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
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold py-4 rounded-xl text-lg hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Start Making Money
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
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
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

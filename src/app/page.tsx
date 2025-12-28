'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Zap,
  ArrowRight,
  Check,
  Loader2,
  Scissors,
  Volume2,
  Type,
  Film,
  Brain,
  LineChart,
  X,
  Clock,
  Sparkles,
  Play,
} from 'lucide-react'

// Animated gradient orbs for background
function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          top: '-20%',
          left: '-10%',
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          top: '20%',
          right: '-15%',
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
          bottom: '10%',
          left: '20%',
        }}
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

// Animated grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
    </div>
  )
}

// Premium countdown timer
function CountdownTimer({ countdown }: { countdown: { hours: number; minutes: number; seconds: number } }) {
  const formatTime = (num: number) => num.toString().padStart(2, '0')

  return (
    <div className="flex items-center justify-center gap-3">
      {[
        { value: countdown.hours, label: 'Hours' },
        { value: countdown.minutes, label: 'Minutes' },
        { value: countdown.seconds, label: 'Seconds' },
      ].map((item, index) => (
        <div key={item.label} className="flex items-center gap-3">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl blur-xl" />
            <div className="relative bg-neutral-900/80 backdrop-blur-sm border border-neutral-700/50 rounded-xl px-5 py-4 min-w-[80px]">
              <motion.div
                key={item.value}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl font-bold text-white font-mono text-center bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent"
              >
                {formatTime(item.value)}
              </motion.div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider text-center mt-1">
                {item.label}
              </div>
            </div>
          </motion.div>
          {index < 2 && (
            <span className="text-2xl text-neutral-600 font-bold">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

// Feature card with premium hover
function FeatureCard({ icon: Icon, title, description, index }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-fuchsia-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative p-6 rounded-2xl border border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm hover:border-neutral-700/50 transition-all duration-300 h-full">
        {/* Gradient line at top */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-shadow">
          <Icon className="w-6 h-6 text-violet-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-violet-200 transition-colors">{title}</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

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

  // Mouse position for subtle parallax
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX)
    mouseY.set(e.clientY)
  }, [mouseX, mouseY])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

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

  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10 text-violet-500" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white antialiased overflow-x-hidden">
      <GradientOrbs />
      <GridBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl border-b border-white/5" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <motion.div
              className="flex items-center gap-2.5"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500/30 rounded-lg blur-lg" />
                <Image
                  src="/logos/kachow.png"
                  alt="Kachow"
                  width={32}
                  height={32}
                  className="relative w-8 h-8 rounded-lg"
                />
              </div>
              <span className="text-lg font-semibold tracking-tight">Kachow</span>
            </motion.div>

            <div className="hidden md:flex items-center gap-8">
              {['Capabilities', 'Early Access'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  className="text-sm text-neutral-400 hover:text-white transition-colors relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
                </a>
              ))}
              <Link href="/miller" className="text-sm text-neutral-400 hover:text-white transition-colors relative group">
                Miller AI Group
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:block text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <motion.button
                onClick={() => setShowSignup(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group text-sm font-medium px-5 py-2.5 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white">Get Early Access</span>
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm mb-8"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-violet-400"
              />
              <span className="text-xs font-medium text-violet-300 uppercase tracking-wider">Coming 2026</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="bg-gradient-to-r from-white via-white to-neutral-400 bg-clip-text text-transparent">
                AI Video Editing
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Built for Monetization
              </span>
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Kachow analyzes what&apos;s working on YouTube right now and applies those patterns
              to your content. We&apos;re building editing software designed to help creators
              reach YouTube Partner Program requirements and earn revenue.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => setShowSignup(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white font-medium">Join Early Access</span>
                <ArrowRight className="relative w-4 h-4 text-white" />
              </motion.button>
              <motion.a
                href="#capabilities"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-neutral-700/50 bg-neutral-900/50 backdrop-blur-sm text-white font-medium hover:bg-neutral-800/50 transition-colors"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-neutral-700 flex items-start justify-center p-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-violet-400"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Value Proposition */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-violet-950/10 to-black" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                <span className="text-white">Edit for the algorithm,</span>
                <br />
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  not for aesthetics
                </span>
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-neutral-900/80 backdrop-blur-sm border border-neutral-800/50 rounded-3xl p-8">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  What we&apos;re building
                </h3>
                <ul className="space-y-4">
                  {[
                    'Real-time analysis of viral YouTube content',
                    'AI-powered editing that mirrors successful patterns',
                    'Automated audio, cuts, b-roll, and captions',
                    'Focus on retention metrics that drive monetization',
                    'Tools designed around YPP requirements',
                  ].map((item, index) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-neutral-300 text-sm">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="relative py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                Planned Capabilities
              </span>
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Features we&apos;re developing to help creators produce algorithm-friendly content.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((item, index) => (
              <FeatureCard key={item.title} {...item} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Early Access */}
      <section id="early-access" className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-violet-950/10 to-black" />
        <div className="relative max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm mb-6"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">Early Access</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Get free lifetime access
            </span>
          </motion.h2>
          <p className="text-neutral-400 mb-8">
            Early supporters will receive free access when we launch.
            Standard pricing will be $23.99/month.
          </p>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 backdrop-blur-sm mb-6">
              <Clock className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-medium text-rose-300">Limited Time Offer</span>
            </div>
            <CountdownTimer countdown={countdown} />
            <p className="text-xs text-neutral-500 mt-4">Offer resets daily at midnight</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-fuchsia-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-neutral-900/80 backdrop-blur-sm border border-neutral-800/50 rounded-3xl p-8">
              <div className="flex items-baseline justify-center gap-3 mb-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">$0</span>
                <span className="text-neutral-500 line-through text-lg">$23.99/mo</span>
              </div>
              <p className="text-sm text-violet-400 mb-8">Forever free with early access code</p>

              <ul className="space-y-3 text-left mb-8">
                {[
                  'Full access to all features at launch',
                  'Priority support',
                  'All future updates included',
                  'No credit card required',
                ].map((item, index) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-neutral-300">{item}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.button
                onClick={() => setShowSignup(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group w-full py-4 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white font-semibold">Claim Your Spot</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-neutral-900/50">
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
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
              onClick={() => setShowSignup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-3xl blur-xl" />
                <div className="relative bg-neutral-900/95 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/30 rounded-xl blur-lg" />
                        <Image
                          src="/logos/kachow.png"
                          alt="Kachow"
                          width={40}
                          height={40}
                          className="relative w-10 h-10 rounded-xl"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Early Access</h3>
                        <p className="text-xs text-neutral-500">Free lifetime access</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSignup(false)}
                      className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-neutral-400" />
                    </button>
                  </div>

                  {submitStatus === 'success' ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold mb-2 text-white">You&apos;re on the list!</h4>
                      <p className="text-sm text-neutral-400 mb-6">
                        We&apos;ll notify you when Kachow is ready to launch.
                      </p>
                      <button
                        onClick={() => {
                          setShowSignup(false)
                          setSubmitStatus('idle')
                        }}
                        className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Close
                      </button>
                    </motion.div>
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
                          className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
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
                          className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
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
                          className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                        />
                        <p className="mt-1.5 text-xs text-neutral-500">
                          Share our Instagram post to receive a code.
                        </p>
                      </div>

                      {submitStatus === 'error' && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                          {errorMessage}
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="relative group w-full py-4 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                        <span className="relative text-white font-semibold flex items-center justify-center gap-2">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Join Early Access'
                          )}
                        </span>
                      </motion.button>

                      <p className="text-center text-xs text-neutral-500">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="text-violet-400 hover:underline">Terms</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>
                      </p>
                    </form>
                  )}
                </div>
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
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="w-8 h-8 text-violet-500" />
      </motion.div>
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

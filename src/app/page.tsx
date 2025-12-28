'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useInView } from 'framer-motion'
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
import { cn } from '@/lib/utils'

// Stripe-style animated gradient mesh
function StripeMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[1200px] h-[1200px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
          top: '-40%',
          left: '-20%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 150, 80, 0],
          y: [0, 100, 50, 0],
          scale: [1, 1.15, 1.05, 1],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[1000px] h-[1000px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 50%)',
          top: '20%',
          right: '-25%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -120, -60, 0],
          y: [0, 120, 60, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
      />
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 50%)',
          bottom: '-20%',
          left: '30%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -80, 40, 0],
          scale: [1, 1.2, 0.95, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 15 }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
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
            whileHover={{ scale: 1.03 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 min-w-[80px] shadow-2xl">
              <motion.div
                key={item.value}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl font-bold text-white font-mono text-center stat-counter"
              >
                {formatTime(item.value)}
              </motion.div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest text-center mt-1 font-medium">
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

// Feature card with Stripe-style design
function FeatureCard({ icon: Icon, title, description, index }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="group relative"
    >
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'relative overflow-hidden rounded-2xl p-6 h-full cursor-default',
          'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
          'backdrop-blur-xl border border-white/5',
          'shadow-2xl shadow-black/20',
          'transition-all duration-500',
          'hover:border-violet-500/30 hover:shadow-violet-500/10'
        )}
      >
        {/* Gradient shine on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
        </div>

        {/* Top gradient line */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/10 group-hover:shadow-violet-500/25 transition-shadow"
          >
            <Icon className="w-7 h-7 text-violet-400" />
          </motion.div>
          <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-violet-100 transition-colors tracking-tight">{title}</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Animated logo
function AnimatedLogo() {
  return (
    <motion.div
      className="relative"
      animate={{
        y: [0, -3, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <motion.div
        className="absolute inset-0 bg-violet-500/40 rounded-xl blur-xl"
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <Image
        src="/logos/kachow.png"
        alt="Kachow"
        width={36}
        height={36}
        className="relative w-9 h-9 rounded-xl"
      />
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
      <StripeMesh />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl border-b border-white/5" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <AnimatedLogo />
              <span className="text-lg font-semibold tracking-tight group-hover:text-violet-300 transition-colors">Kachow</span>
            </Link>

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
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-36">
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
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-xl mb-10 shadow-lg shadow-violet-500/10"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-violet-400"
              />
              <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Coming 2026</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
              <span className="bg-gradient-to-r from-white via-white to-neutral-300 bg-clip-text text-transparent">
                AI Video Editing
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Built for Monetization
              </span>
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto mb-12">
              Kachow analyzes what&apos;s working on YouTube right now and applies those patterns
              to your content. We&apos;re building editing software designed to help creators
              reach YouTube Partner Program requirements and earn revenue.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => setShowSignup(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/20"
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white font-medium hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </motion.a>
            </div>
          </motion.div>
        </div>

      </section>

      {/* Value Proposition */}
      <section className="relative py-28">
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-8 leading-tight">
                <span className="text-white">Edit for the algorithm,</span>
                <br />
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  not for aesthetics
                </span>
              </h2>
              <div className="space-y-5 text-neutral-400 text-lg leading-relaxed">
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
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-fuchsia-500/20 rounded-3xl blur-3xl" />
              <div className={cn(
                'relative rounded-3xl p-8',
                'bg-gradient-to-br from-neutral-900/95 to-neutral-900/80',
                'backdrop-blur-xl border border-white/10',
                'shadow-2xl'
              )}>
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20"
                  >
                    <Sparkles className="w-5 h-5 text-violet-400" />
                  </motion.div>
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
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.3 }}
                        className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-violet-500/30"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </motion.div>
                      <span className="text-neutral-300">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="relative py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-xl mb-6"
            >
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-blue-300 uppercase tracking-widest">Features</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
              <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                Planned Capabilities
              </span>
            </h2>
            <p className="text-lg text-neutral-400 max-w-xl mx-auto">
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
      <section id="early-access" className="relative py-28">
        <div className="relative max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl mb-6"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-4 h-4 text-emerald-400" />
            </motion.div>
            <span className="text-xs font-medium text-emerald-300 uppercase tracking-widest">Early Access</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5"
          >
            <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
              Get free lifetime access
            </span>
          </motion.h2>
          <p className="text-lg text-neutral-400 mb-10">
            Early supporters will receive free access when we launch.
            Standard pricing will be $23.99/month.
          </p>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 backdrop-blur-xl mb-6">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Clock className="w-4 h-4 text-rose-400" />
              </motion.div>
              <span className="text-sm font-medium text-rose-300">Limited Time Offer</span>
            </div>
            <CountdownTimer countdown={countdown} />
            <p className="text-xs text-neutral-500 mt-5">Offer resets daily at midnight</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/20 via-purple-500/15 to-fuchsia-500/20 rounded-[2rem] blur-3xl" />
            <div className={cn(
              'relative rounded-3xl p-8',
              'bg-gradient-to-br from-neutral-900/95 to-neutral-900/80',
              'backdrop-blur-xl border border-white/10',
              'shadow-2xl'
            )}>
              <div className="flex items-baseline justify-center gap-3 mb-3">
                <span className="text-6xl font-bold text-white stat-counter">$0</span>
                <span className="text-neutral-500 line-through text-xl">$23.99/mo</span>
              </div>
              <p className="text-sm text-violet-400 mb-10 font-medium">Forever free with early access code</p>

              <ul className="space-y-4 text-left mb-10">
                {[
                  'Full access to all features at launch',
                  'Priority support',
                  'All future updates included',
                  'No credit card required',
                ].map((item, index) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                    <span className="text-neutral-300">{item}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.button
                onClick={() => setShowSignup(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group w-full py-4 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white font-semibold text-lg">Claim Your Spot</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-14 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
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
              className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50"
              onClick={() => setShowSignup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-3xl blur-2xl" />
                <div className={cn(
                  'relative rounded-3xl p-6',
                  'bg-neutral-900/98 backdrop-blur-2xl border border-white/10',
                  'shadow-2xl'
                )}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/40 rounded-xl blur-lg" />
                        <Image
                          src="/logos/kachow.png"
                          alt="Kachow"
                          width={44}
                          height={44}
                          className="relative w-11 h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">Early Access</h3>
                        <p className="text-xs text-neutral-500">Free lifetime access</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSignup(false)}
                      className="p-2 hover:bg-white/5 rounded-xl transition-colors"
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
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
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
                          className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
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
                          className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
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
                          className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                        <p className="mt-2 text-xs text-neutral-500">
                          Share our Instagram post to receive a code.
                        </p>
                      </div>

                      {submitStatus === 'error' && (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                          {errorMessage}
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="relative group w-full py-4 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
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

                      <p className="text-center text-xs text-neutral-500 pt-2">
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

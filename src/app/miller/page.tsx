'use client'

import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SOCIAL_LINKS, PROJECTS } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CinematicScene } from '@/components/hacker-os'
import { InquiryForm } from '@/components/InquiryForm'
import {
  Instagram,
  Linkedin,
  ArrowRight,
  Zap,
  BarChart3,
  Brain,
  Shirt,
  Film,
  ChevronDown,
  Newspaper,
  Sparkles,
  Code2,
  Cpu,
  Globe2,
  Target,
  TrendingUp,
  Rocket,
  Mail,
} from 'lucide-react'

// Stripe-style animated gradient mesh
function StripeMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[1200px] h-[1200px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 50%)',
          top: '-35%',
          left: '-20%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 120, 60, 0],
          y: [0, 80, 40, 0],
          scale: [1, 1.15, 1.05, 1],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[900px] h-[900px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 50%)',
          top: '30%',
          right: '-25%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -100, -50, 0],
          y: [0, 100, 50, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
      />
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 50%)',
          bottom: '-15%',
          left: '30%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -60, 30, 0],
          scale: [1, 1.2, 0.95, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 12 }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  )
}

// Animated counter component
function AnimatedCounter({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const spring = useSpring(0, { duration: 2000 })
  const display = useTransform(spring, (v) => Math.round(v))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, value, spring])

  useEffect(() => {
    return display.on('change', (v) => setDisplayValue(v))
  }, [display])

  return (
    <span ref={ref} className={cn('stat-counter', className)}>
      {displayValue}{suffix}
    </span>
  )
}

// Venture card with 3D hover effect
function VentureCard({
  venture,
  Icon,
  status,
  index
}: {
  venture: typeof PROJECTS[0]
  Icon: typeof Zap
  status: { label: string; color: string }
  index: number
}) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const x = e.clientX - centerX
    const y = e.clientY - centerY
    setRotateY(x / 25)
    setRotateX(-y / 25)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
    >
      <Link href={`/projects/${venture.slug}`}>
        <motion.div
          className="relative group cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: 'transform 0.15s ease',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ scale: 1.02 }}
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className={cn(
            'relative overflow-hidden rounded-2xl p-6 h-full',
            'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
            'backdrop-blur-xl border border-white/5',
            'shadow-2xl shadow-black/20',
            'transition-all duration-500',
            'group-hover:border-violet-500/30 group-hover:shadow-violet-500/10'
          )}>
            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </div>

            {/* Top line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
                <Badge variant="outline" className={cn('border', status.color)}>
                  {status.label}
                </Badge>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-violet-300 transition-colors">
                {venture.name}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {venture.description}
              </p>

              <motion.div
                className="mt-4 flex items-center gap-2 text-violet-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ x: -10 }}
                whileHover={{ x: 0 }}
              >
                Explore <ArrowRight className="w-4 h-4" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

// Stats section
function StatsSection() {
  const stats = [
    { value: 5, suffix: '+', label: 'Ventures Built', icon: Rocket },
    { value: 3, suffix: '+', label: 'AI Projects', icon: Cpu },
    { value: 2, suffix: '', label: 'Years Founding', icon: TrendingUp },
    { value: 100, suffix: '%', label: 'Execution Focus', icon: Target },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className={cn(
            'relative overflow-hidden rounded-2xl p-6 text-center',
            'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
            'backdrop-blur-xl border border-white/5',
            'shadow-xl hover:border-violet-500/20 hover:shadow-violet-500/5',
            'transition-all duration-300'
          )}
        >
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center"
          >
            <stat.icon className="w-6 h-6 text-violet-400" />
          </motion.div>
          <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            <AnimatedCounter value={stat.value} suffix={stat.suffix} />
          </div>
          <div className="text-sm text-neutral-500 mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  )
}

const statusConfig: Record<string, { label: string; color: string }> = {
  'active': { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  'development': { label: 'In Development', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  'coming-soon': { label: 'Coming Soon', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  'past': { label: 'Past Venture', color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30' },
}

const ventureIcons: Record<string, typeof Zap> = {
  'kachow': Zap,
  'stuntman': BarChart3,
  'brainbox': Brain,
  'arcene': Shirt,
  'cozyfilmz': Film,
}

const targetCompanies = [
  { name: 'OpenAI', logo: '/company-logos/openai.svg' },
  { name: 'Anthropic', logo: '/company-logos/anthropic.svg' },
  { name: 'xAI', logo: '/company-logos/xai.svg' },
  { name: 'Google DeepMind', logo: '/company-logos/deepmind.svg' },
  { name: 'Perplexity', logo: '/company-logos/perplexity.svg' },
  { name: 'NVIDIA', logo: '/company-logos/nvidia.svg' },
  { name: 'Meta AI', logo: '/company-logos/meta.svg' },
  { name: 'Cohere', logo: '/company-logos/cohere.svg' },
]

function MillerPageContent() {
  const [isProcessingAuth, setIsProcessingAuth] = useState(false)
  const [showCinematic, setShowCinematic] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { scrollYProgress } = useScroll()

  // Parallax effects
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])

  // Handle Enter System button click - trigger cinematic
  const handleEnterSystem = useCallback(() => {
    setShowCinematic(true)
  }, [])

  // Handle cinematic completion - always go to login page first
  const handleCinematicComplete = useCallback(() => {
    setIsNavigating(true)
    router.push('/login')
  }, [router])

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

  const techVentures = PROJECTS.filter(p => p.category === 'technology')
  const otherVentures = PROJECTS.filter(p => p.category === 'venture' || p.category === 'past')

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
    <>
      {/* Cinematic Intro Scene */}
      <AnimatePresence>
        {showCinematic && (
          <CinematicScene
            onComplete={handleCinematicComplete}
            audioSrc="/audio/intro-song.mp3"
          />
        )}
      </AnimatePresence>

      {/* Inquiry Form Modal */}
      <InquiryForm isOpen={isInquiryOpen} onClose={() => setIsInquiryOpen(false)} />

      {/* Navigation overlay - keeps screen black during transition */}
      {isNavigating && (
        <div className="fixed inset-0 z-[9998] bg-black" />
      )}

      <div className="min-h-screen bg-black text-white antialiased overflow-x-hidden">
        <StripeMesh />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl border-b border-white/5" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/miller" className="flex items-center gap-3 group">
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  className="absolute inset-0 bg-violet-500/30 rounded-lg blur-lg"
                  animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <Image
                  src="/logos/miller-ai-group.svg"
                  alt="Miller AI Group"
                  width={36}
                  height={36}
                  className="relative w-9 h-9"
                />
              </motion.div>
              <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                MILLER AI GROUP
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/resume" className="hidden sm:block text-sm text-neutral-400 hover:text-white transition-colors relative group px-3 py-2">
                Resume
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link href="/press" className="hidden sm:block text-sm text-neutral-400 hover:text-white transition-colors relative group px-3 py-2">
                Press
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/25"
                  onClick={handleEnterSystem}
                >
                  Enter System
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center relative pt-16">
        <motion.div
          className="relative z-10 max-w-4xl mx-auto px-6 text-center"
          style={{ y: y1, opacity }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-xl mb-10 shadow-lg shadow-violet-500/10"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-violet-400" />
              </motion.div>
              <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Building the Future with AI</span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
              <span className="bg-gradient-to-r from-white via-white to-neutral-300 bg-clip-text text-transparent">
                Hudson Barnes
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xl md:text-2xl mb-4">
              <span className="text-violet-400 font-medium">Founder</span>
              {' '}&bull;{' '}
              <span className="text-purple-400 font-medium">AI Engineer</span>
              {' '}&bull;{' '}
              <span className="text-fuchsia-400 font-medium">Innovator</span>
            </p>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10">
              Building technology ventures under{' '}
              <span className="text-violet-400 font-semibold">Miller AI Group</span>.
              Focused on systems that compound, execution that scales, and leverage that multiplies.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="min-h-[52px] px-8 text-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-2xl shadow-violet-500/25 border-0"
                onClick={() => router.push('/resume')}
              >
                View Resume
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[52px] px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                onClick={handleEnterSystem}
              >
                Enter System
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-center gap-4 mt-10"
          >
            {[
              { href: SOCIAL_LINKS.instagram, icon: Instagram },
              { href: SOCIAL_LINKS.linkedin, icon: Linkedin },
            ].map((social, i) => (
              <motion.a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-violet-500/20 hover:border-violet-500/30 text-neutral-400 hover:text-violet-400 transition-all"
              >
                <social.icon className="w-5 h-5" />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>

      </section>

      {/* Stats Section */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Track Record
            </h2>
          </motion.div>
          <StatsSection />
        </div>
      </section>

      {/* Technology Ventures Section */}
      <section className="py-28 relative">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-xl mb-6"
            >
              <Code2 className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Technology Portfolio</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Technology Ventures
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              AI-powered systems focused on automation, trading, and intelligent infrastructure.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {techVentures.map((venture, index) => {
              const Icon = ventureIcons[venture.slug] || Zap
              const status = statusConfig[venture.status] || statusConfig.active
              return (
                <VentureCard
                  key={venture.slug}
                  venture={venture}
                  Icon={Icon}
                  status={status}
                  index={index}
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* Other Ventures */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-xl mb-6"
            >
              <Rocket className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-purple-300 uppercase tracking-widest">Entrepreneurial Journey</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Ventures & Experience
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Entrepreneurial ventures that shaped my journey as a founder.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {otherVentures.map((venture, index) => {
              const Icon = ventureIcons[venture.slug] || Zap
              const status = statusConfig[venture.status] || statusConfig.active
              return (
                <motion.div
                  key={venture.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className={cn(
                    'relative overflow-hidden rounded-2xl p-6',
                    'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                    'backdrop-blur-xl border border-white/5',
                    'shadow-xl hover:border-purple-500/20',
                    'transition-all duration-300 group'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 group-hover:from-purple-500 group-hover:to-fuchsia-600 transition-all shrink-0"
                    >
                      <Icon className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-xl font-semibold group-hover:text-purple-400 transition-colors">{venture.name}</h3>
                        <Badge variant="outline" className={`shrink-0 ${status.color}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-400 leading-relaxed mb-4">
                        {venture.description}
                      </p>

                      {venture.slug === 'cozyfilmz' && (
                        <div className="space-y-3 mb-4">
                          <p className="text-xs text-neutral-500">
                            As CEO & Co-Founder, learned invaluable lessons in operations, real estate, and pivoting under pressure.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {venture.instagram && (
                              <a
                                href={venture.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <Instagram className="w-3.5 h-3.5" />
                                Instagram
                              </a>
                            )}
                            {venture.pressLinks?.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <Newspaper className="w-3.5 h-3.5" />
                                Press
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link
                        href={`/projects/${venture.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors group/link"
                      >
                        Learn More
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Target Companies */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-xl mb-6"
            >
              <Globe2 className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Career Trajectory</span>
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Target Companies
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Developing skills and building projects aligned with the frontier of AI development.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center items-center gap-8 md:gap-10"
          >
            {targetCompanies.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1, y: -4 }}
                className="group flex flex-col items-center"
              >
                <div className={cn(
                  'w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center p-4',
                  'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                  'backdrop-blur-xl border border-white/5',
                  'transition-all duration-300 shadow-lg',
                  'group-hover:border-violet-500/30 group-hover:shadow-violet-500/10'
                )}>
                  <Image
                    src={company.logo}
                    alt={company.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-2 group-hover:text-violet-400 transition-colors">
                  {company.name}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 backdrop-blur-xl mb-6"
            >
              <Brain className="w-4 h-4 text-fuchsia-400" />
              <span className="text-xs font-medium text-fuchsia-300 uppercase tracking-widest">Mindset</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
              Founder Philosophy
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Systems Over Goals',
                description: 'Building scalable systems that compound over time. Every project is designed with long-term leverage in mind.',
                icon: Cpu,
              },
              {
                title: 'Execution First',
                description: 'Ideas without execution are worthless. Shipping working software and iterating based on real feedback.',
                icon: Rocket,
              },
              {
                title: 'Compounding Returns',
                description: 'Building assets that appreciate. Skills, systems, and relationships that grow stronger with time.',
                icon: TrendingUp,
              },
            ].map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className={cn(
                  'relative overflow-hidden rounded-2xl p-6 text-center',
                  'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                  'backdrop-blur-xl border border-white/5',
                  'shadow-xl hover:border-fuchsia-500/20 hover:shadow-fuchsia-500/5',
                  'transition-all duration-300'
                )}
              >
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center"
                >
                  <point.icon className="w-7 h-7 text-fuchsia-400" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {point.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiries & Offers Section */}
      <section className="py-28 relative">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-xl mb-6"
            >
              <Mail className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Direct Line</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Inquiries & Offers
            </h2>
            <p className="text-lg text-neutral-400 mb-10 max-w-xl mx-auto">
              Have a business proposal, partnership opportunity, or inquiry? I&apos;m always open to connecting with serious opportunities.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                onClick={() => setIsInquiryOpen(true)}
                className="px-10 py-6 text-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-2xl shadow-violet-500/25 border-0"
              >
                <Mail className="w-5 h-5 mr-2" />
                Get in Touch
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 relative">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Want to learn more?
            </h2>
            <p className="text-lg text-neutral-400 mb-10">
              Check out my resume, explore the ventures, or connect directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="lg" className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-2xl shadow-violet-500/25 border-0">
                  <Link href="/resume">View Full Resume</Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild variant="outline" size="lg" className="border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20">
                  <Link href="/press">Press & Accomplishments</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/miller-ai-group.svg"
                alt="Miller AI Group"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <div>
                <p className="font-medium">Hudson Barnes</p>
                <p className="text-sm text-neutral-500">Miller AI Group</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <Link href="/resume" className="hover:text-white transition-colors">Resume</Link>
              <Link href="/press" className="hover:text-white transition-colors">Press</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>

            <div className="flex items-center gap-4">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-neutral-500 hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-neutral-500 hover:text-white transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} Miller AI Group. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}

function MillerPageFallback() {
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

export default function MillerPage() {
  return (
    <Suspense fallback={<MillerPageFallback />}>
      <MillerPageContent />
    </Suspense>
  )
}

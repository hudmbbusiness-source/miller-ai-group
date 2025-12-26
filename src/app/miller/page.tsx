'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SOCIAL_LINKS, PROJECTS } from '@/types'
import { createClient } from '@/lib/supabase/client'
import {
  Instagram,
  Linkedin,
  ArrowRight,
  Zap,
  TrendingUp,
  Brain,
  Shirt,
  Film,
  ChevronDown,
  Newspaper,
  Loader2,
} from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string }> = {
  'active': { label: 'Active', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  'development': { label: 'In Development', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  'coming-soon': { label: 'Coming Soon', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'past': { label: 'Past Venture', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

const ventureIcons: Record<string, typeof Zap> = {
  'kachow': Zap,
  'stuntman': TrendingUp,
  'brainbox': Brain,
  'arcene': Shirt,
  'cozyfilmz': Film,
}

const ventureLogos = [
  { name: 'Kachow', logo: '/logos/kachow.png' },
  { name: 'Miller AI Group', logo: '/logos/miller-ai-group.svg' },
  { name: 'Arcene', logo: '/logos/arcene.png' },
  { name: 'CozyFilmz', logo: '/logos/cozyfilmz.png' },
]

function LogoCarousel() {
  const allLogos = [...ventureLogos, ...ventureLogos, ...ventureLogos]

  return (
    <div className="relative overflow-hidden py-8 bg-muted/20 border-y border-border/30">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

      <motion.div
        className="flex gap-16 items-center"
        animate={{ x: [0, -1200] }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {allLogos.map((venture, index) => (
          <div
            key={`${venture.name}-${index}`}
            className="shrink-0 px-8"
          >
            <Image
              src={venture.logo}
              alt={venture.name}
              width={80}
              height={80}
              className="w-16 h-16 md:w-20 md:h-20 object-contain opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
            />
          </div>
        ))}
      </motion.div>
    </div>
  )
}

function MillerPageContent() {
  const [hoveredVenture, setHoveredVenture] = useState<string | null>(null)
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

  const techVentures = PROJECTS.filter(p => p.category === 'technology')
  const otherVentures = PROJECTS.filter(p => p.category === 'venture' || p.category === 'past')

  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Completing login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="min-h-screen flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-amber-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

        <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center mb-3"
            >
              <Image
                src="/logos/miller-ai-group.svg"
                alt="Miller AI Group"
                width={48}
                height={48}
                className="w-12 h-12 mb-2"
              />
              <span className="font-bold text-lg tracking-wide">MILLER AI GROUP</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2"
            >
              <Button asChild variant="ghost" size="sm">
                <Link href="/resume">Resume</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/press">Press</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/intro">Enter System</Link>
              </Button>
            </motion.div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
                  Hudson Barnes
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <p className="text-xl md:text-2xl text-muted-foreground mb-4">
                  Founder | Innovator
                </p>
                <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-8">
                  Building technology ventures under{' '}
                  <span className="text-foreground font-medium">Miller AI Group</span>.
                  Focused on systems that compound, execution that scales, and leverage that multiplies.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button
                  size="lg"
                  className="min-h-[52px] px-8 text-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20"
                  onClick={() => router.push('/resume')}
                >
                  View Resume
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-[52px] px-8 text-lg border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
                  onClick={() => router.push('/intro')}
                >
                  Enter System
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex justify-center gap-4 mt-8"
              >
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-muted/50 hover:bg-amber-500/20 hover:text-amber-500 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href={SOCIAL_LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-muted/50 hover:bg-amber-500/20 hover:text-amber-500 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-muted-foreground"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </section>

      <LogoCarousel />

      <section className="py-20 md:py-32 bg-muted/30 border-b border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Technology Ventures</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI-powered systems focused on automation, trading, and intelligent infrastructure.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {techVentures.map((venture, index) => {
              const Icon = ventureIcons[venture.slug] || Zap
              const status = statusConfig[venture.status] || statusConfig.active
              return (
                <motion.div
                  key={venture.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onMouseEnter={() => setHoveredVenture(venture.slug)}
                  onMouseLeave={() => setHoveredVenture(null)}
                >
                  <Link href={`/projects/${venture.slug}`}>
                    <Card className={`h-full transition-all duration-300 cursor-pointer group ${
                      hoveredVenture === venture.slug ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02]' : 'hover:border-border'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-xl bg-muted group-hover:bg-amber-500/10 transition-colors">
                            <Icon className="w-6 h-6 text-amber-500" />
                          </div>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-amber-500 transition-colors">
                          {venture.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {venture.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ventures & Experience</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Entrepreneurial ventures that shaped my journey as a founder.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {otherVentures.map((venture, index) => {
              const Icon = ventureIcons[venture.slug] || Zap
              const status = statusConfig[venture.status] || statusConfig.active
              return (
                <motion.div
                  key={venture.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card className="h-full overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-muted group-hover:bg-amber-500/10 transition-colors shrink-0">
                          <Icon className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{venture.name}</h3>
                            <Badge variant="outline" className={`shrink-0 ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {venture.description}
                          </p>

                          {venture.slug === 'cozyfilmz' && (
                            <div className="space-y-3 mb-4">
                              <p className="text-xs text-muted-foreground">
                                As CEO & Co-Founder, learned invaluable lessons in operations, real estate, and pivoting under pressure.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {venture.instagram && (
                                  <a
                                    href={venture.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-amber-500 hover:underline"
                                  >
                                    <Instagram className="w-3 h-3" />
                                    Instagram
                                  </a>
                                )}
                                {venture.pressLinks?.map((link, i) => (
                                  <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-amber-500 hover:underline"
                                  >
                                    <Newspaper className="w-3 h-3" />
                                    Press
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          <Link
                            href={`/projects/${venture.slug}`}
                            className="inline-flex items-center gap-1 text-sm text-amber-500 hover:underline"
                          >
                            Learn More
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="about" className="py-20 md:py-32 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">About</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <p className="text-lg text-muted-foreground mb-4">
                  Hudson Barnes is a founder and technologist based in Provo, Utah, currently studying Business at Brigham Young University with a focus on AI Software Engineering and entrepreneurship.
                </p>
                <p className="text-muted-foreground mb-4">
                  As the founder of <span className="text-foreground font-medium">Miller AI Group</span>, Hudson builds technology ventures that leverage artificial intelligence to solve real problems. His work spans AI-powered trading systems, automation platforms, and intelligent infrastructure.
                </p>
                <p className="text-muted-foreground">
                  With experience founding multiple companies including CozyFilmz (a real estate media startup) and Arcene (a fashion brand), Hudson brings a unique blend of technical expertise and entrepreneurial grit to every venture.
                </p>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Currently</p>
                  <p className="font-medium">Business Student @ BYU</p>
                  <p className="text-sm text-muted-foreground">Focus: AI Software Engineering</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Building</p>
                  <p className="font-medium">Miller AI Group</p>
                  <p className="text-sm text-muted-foreground">AI-powered technology ventures</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Mission</p>
                  <p className="font-medium">Build systems that scale</p>
                  <p className="text-sm text-muted-foreground">Compound returns through technology</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Founder Philosophy</h2>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Systems Over Goals',
                  description: 'Building scalable systems that compound over time. Every project is designed with long-term leverage in mind.',
                },
                {
                  title: 'Execution First',
                  description: 'Ideas without execution are worthless. Shipping working software and iterating based on real feedback.',
                },
                {
                  title: 'Compounding Returns',
                  description: 'Building assets that appreciate. Skills, systems, and relationships that grow stronger with time.',
                },
              ].map((point, index) => (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-amber-500">{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Want to learn more?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Check out my resume, explore the ventures, or connect directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500">
                <Link href="/resume">View Full Resume</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50">
                <Link href="/press">Press & Accomplishments</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logos/miller-ai-group.svg"
                  alt="Miller AI Group"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <div>
                  <p className="font-medium">Hudson Barnes</p>
                  <p className="text-sm text-muted-foreground">Miller AI Group</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Building technology ventures that leverage AI to solve real problems. Based in Provo, Utah.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <Link href="/resume" className="text-muted-foreground hover:text-foreground transition-colors">
                    Resume
                  </Link>
                </li>
                <li>
                  <Link href="/press" className="text-muted-foreground hover:text-foreground transition-colors">
                    Press
                  </Link>
                </li>
                <li>
                  <Link href="/intro" className="text-muted-foreground hover:text-foreground transition-colors">
                    Enter System
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Miller AI Group. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function MillerPageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Zap,
  ExternalLink,
  Video,
  Sparkles,
  TrendingUp,
  Scissors,
  Instagram,
  Youtube,
  BarChart3,
  Users,
  Clock,
  Lock,
  Settings,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

const OWNER_EMAIL = 'kachowapp@gmail.com'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

function PremiumCard({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl',
        'border border-border/50 hover:border-amber-500/20',
        'transition-all duration-300',
        'shadow-lg',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

const features = [
  {
    icon: TrendingUp,
    title: 'Algorithm-Driven Editing',
    description: 'Analyzes YouTube algorithm trends to identify what content performs best',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Scissors,
    title: 'Auto-Clip Generation',
    description: 'Automatically extracts viral-worthy moments from long-form content',
    color: 'from-purple-500 to-fuchsia-500',
  },
  {
    icon: Sparkles,
    title: 'Smart Optimization',
    description: 'Optimizes clips for maximum engagement across social platforms',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: Video,
    title: 'Multi-Platform Export',
    description: 'Export optimized content for YouTube Shorts, TikTok, and Instagram Reels',
    color: 'from-emerald-400 to-green-500',
  },
]

function OwnerDashboard({ user: _user }: { user: User }) {
  const [earlyAccessStats, setEarlyAccessStats] = useState<{
    total: number
    signups: Array<{
      email: string
      full_name: string | null
      access_code: string
      created_at: string
      email_sent: boolean
    }>
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const loadEarlyAccessStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('early_access_signups')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setEarlyAccessStats({
          total: data.length,
          signups: data as typeof earlyAccessStats extends null ? never : NonNullable<typeof earlyAccessStats>['signups'],
        })
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    loadEarlyAccessStats()
  }, [loadEarlyAccessStats])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Admin Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25"
          >
            <Zap className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Kachow AI Dashboard
            </h1>
            <p className="text-muted-foreground">Admin Control Panel</p>
          </div>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
          <Lock className="w-3 h-3 mr-1" />
          Owner Access
        </Badge>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, value: earlyAccessStats?.total || 0, label: 'Early Access Signups', color: 'blue' },
          { icon: Youtube, value: 0, label: 'Videos Processed', color: 'amber' },
          { icon: BarChart3, value: 0, label: 'Clips Generated', color: 'emerald' },
          { icon: Clock, value: '0h', label: 'Time Saved', color: 'purple' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <PremiumCard delay={index * 0.05}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className={cn(
                      'p-2.5 rounded-xl bg-gradient-to-br shadow-lg',
                      stat.color === 'blue' && 'from-blue-500 to-cyan-600 shadow-blue-500/25',
                      stat.color === 'amber' && 'from-amber-400 to-orange-500 shadow-amber-500/25',
                      stat.color === 'emerald' && 'from-emerald-400 to-green-500 shadow-emerald-500/25',
                      stat.color === 'purple' && 'from-purple-500 to-fuchsia-600 shadow-purple-500/25'
                    )}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  <div>
                    <motion.p
                      className="text-2xl font-bold"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                    >
                      {stat.value}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>
          </motion.div>
        ))}
      </div>

      {/* Early Access Signups */}
      <motion.div variants={itemVariants}>
        <PremiumCard>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Early Access Signups</CardTitle>
                <CardDescription>Users who signed up for early access</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadEarlyAccessStats}
              disabled={loadingStats}
              className="hover:border-amber-500/50 hover:text-amber-500"
            >
              {loadingStats ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-8 h-8 text-amber-500" />
                </motion.div>
              </div>
            ) : earlyAccessStats && earlyAccessStats.signups.length > 0 ? (
              <div className="space-y-3">
                {earlyAccessStats.signups.slice(0, 10).map((signup, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-transparent hover:border-amber-500/20 transition-all"
                  >
                    <div>
                      <p className="font-medium">{signup.full_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">{signup.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                        {signup.access_code}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(signup.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {earlyAccessStats.signups.length > 10 && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    +{earlyAccessStats.signups.length - 10} more signups
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-amber-500/50" />
                </div>
                <p className="text-muted-foreground">No signups yet</p>
                <p className="text-sm text-muted-foreground">Share your Instagram post to get early access signups</p>
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </motion.div>

      {/* System Status */}
      <motion.div variants={itemVariants}>
        <PremiumCard className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <CardTitle className="text-lg">System Status</CardTitle>
            </div>
            <CardDescription>
              Kachow AI is in active development. YouTube API integration and video processing
              pipelines are being built.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Supabase Database', status: 'Connected', color: 'emerald' },
                { name: 'Early Access API', status: 'Active', color: 'emerald' },
                { name: 'YouTube API', status: 'In Progress', color: 'amber' },
                { name: 'Video Processing', status: 'In Progress', color: 'amber' },
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-2 text-sm p-3 rounded-xl bg-muted/30"
                >
                  <motion.div
                    animate={item.color === 'amber' ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      item.color === 'emerald' && 'bg-emerald-500',
                      item.color === 'amber' && 'bg-amber-500'
                    )}
                  />
                  <span>{item.name}</span>
                  <Badge variant="outline" className={cn(
                    'ml-auto text-xs',
                    item.color === 'emerald' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
                    item.color === 'amber' && 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  )}>
                    {item.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </PremiumCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <PremiumCard>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" asChild className="hover:border-amber-500/50 hover:text-amber-500">
              <Link href="/">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Landing Page
              </Link>
            </Button>
            <Button variant="outline" asChild className="hover:border-pink-500/50 hover:text-pink-500">
              <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
                <Instagram className="w-4 h-4 mr-2" />
                @kachowai
              </a>
            </Button>
            <Button variant="outline" asChild className="hover:border-violet-500/50 hover:text-violet-500">
              <Link href="/app/admin/verify">
                <Settings className="w-4 h-4 mr-2" />
                System Verify
              </Link>
            </Button>
          </CardContent>
        </PremiumCard>
      </motion.div>
    </motion.div>
  )
}

function PublicView() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 10 }}
          className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25"
        >
          <Zap className="w-8 h-8 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Kachow AI
          </h1>
          <p className="text-muted-foreground">AI auto-editing powered by algorithmic data</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-amber-500/10 text-amber-500 border-amber-500/30">
          In Development
        </Badge>
      </motion.div>

      {/* About Section */}
      <motion.div variants={itemVariants}>
        <PremiumCard>
          <CardHeader>
            <CardTitle className="text-lg">About Kachow AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Kachow AI is an advanced auto-editing platform that leverages real-time YouTube algorithmic data
              to identify viral moments in long-form content. The system automatically generates optimized
              short-form clips designed for maximum engagement and distribution across social platforms.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="flex gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-transparent hover:border-amber-500/20 transition-all"
                >
                  <div className={cn(
                    'p-2.5 rounded-xl bg-gradient-to-br h-fit shadow-lg',
                    feature.color,
                    feature.color.includes('amber') && 'shadow-amber-500/25',
                    feature.color.includes('purple') && 'shadow-purple-500/25',
                    feature.color.includes('blue') && 'shadow-blue-500/25',
                    feature.color.includes('emerald') && 'shadow-emerald-500/25'
                  )}>
                    <feature.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </PremiumCard>
      </motion.div>

      {/* Development Status */}
      <motion.div variants={itemVariants}>
        <PremiumCard className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <CardTitle className="text-lg">Currently In Development</CardTitle>
            </div>
            <CardDescription>
              Kachow AI is being actively developed. The core AI editing engine, YouTube data integration,
              and export pipelines are under construction. Follow our progress on Instagram.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-lg shadow-pink-500/25">
              <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
                <Instagram className="w-4 h-4" />
                Follow @kachowai
              </a>
            </Button>
          </CardContent>
        </PremiumCard>
      </motion.div>

      {/* Target Use Cases */}
      <motion.div variants={itemVariants}>
        <PremiumCard>
          <CardHeader>
            <CardTitle className="text-lg">Target Use Cases</CardTitle>
            <CardDescription>Who Kachow AI is designed for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['YouTube Creators', 'Podcast Editors', 'Content Agencies', 'Social Media Managers', 'Video Editors'].map((tag, index) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Badge variant="outline" className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                    {tag}
                  </Badge>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Designed to save hours of manual editing by automating clip selection and optimization
            </p>
          </CardContent>
        </PremiumCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <PremiumCard>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" asChild className="hover:border-amber-500/50 hover:text-amber-500">
              <Link href="/">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Kachow.app
              </Link>
            </Button>
            <Button variant="outline" asChild className="hover:border-pink-500/50 hover:text-pink-500">
              <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
                <Instagram className="w-4 h-4 mr-2" />
                Instagram
              </a>
            </Button>
          </CardContent>
        </PremiumCard>
      </motion.div>
    </motion.div>
  )
}

export default function KachowToolPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10 text-amber-500" />
        </motion.div>
      </div>
    )
  }

  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()

  if (isOwner) {
    return <OwnerDashboard user={user} />
  }

  return <PublicView />
}

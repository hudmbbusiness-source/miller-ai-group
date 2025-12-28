'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  FileText,
  Link2,
  Target,
  CheckCircle2,
  Calendar,
  Loader2,
  RefreshCw,
  Zap,
  Trophy,
  Flame,
  FolderOpen,
  Grid3X3,
  Sparkles,
  ArrowUpRight,
  Activity,
} from 'lucide-react'
import {
  PremiumProgressRing,
  PremiumBarChart,
  PremiumDonutChart,
  PremiumStatCard,
  AnimatedNumber,
} from '@/components/charts/premium-charts'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  overview: {
    totalNotes: number
    totalLinks: number
    totalBoards: number
    totalFiles: number
    activeGoals: number
    completedGoals: number
  }
  thisWeek: {
    notes: number
    links: number
  }
  thisMonth: {
    notes: number
    links: number
    files: number
    monthlyChange: number
  }
  streaks: {
    current: number
    longest: number
  }
  activityByDay: Array<{ day: string; count: number }>
  dailyActivity: Array<{ date: string; notes: number; links: number }>
  weeklyTrend: Array<{ week: string; notes: number; links: number; goals: number }>
  categoryBreakdown: Array<{ name: string; value: number; color: string }>
  productivityScore: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function ProductivityAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const result = await res.json()
      if (result.success) {
        setData(result.analytics)
      }
    } catch (error) {
      console.error('Analytics fetch error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalytics()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10 text-violet-500" />
        </motion.div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Unable to load analytics</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const hasActivity = data.dailyActivity.some(d => d.notes > 0 || d.links > 0)

  // Prepare chart data
  const weeklyBarData = data.weeklyTrend.slice(-7).map((w) => ({
    label: w.week.split(' ')[0],
    value: w.notes + w.links + w.goals,
  }))

  const dayActivityData = data.activityByDay.map((d) => ({
    label: d.day,
    value: d.count,
  }))

  // Premium color scheme for donut
  const categoryColors = [
    '#8b5cf6', // violet
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
  ]

  const donutData = data.categoryBreakdown.map((cat, i) => ({
    name: cat.name,
    value: cat.value,
    color: categoryColors[i % categoryColors.length],
  }))

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
            Analytics
          </h2>
          <p className="text-muted-foreground mt-1">Your productivity insights</p>
        </div>
        <motion.button
          onClick={handleRefresh}
          disabled={refreshing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl',
            'bg-gradient-to-r from-violet-500/10 to-purple-500/10',
            'border border-violet-500/20 hover:border-violet-500/40',
            'text-sm font-medium text-violet-500',
            'transition-all duration-300'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </motion.button>
      </motion.div>

      {/* Main Score + Streaks Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Productivity Score - Hero Card */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-1 relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 border border-violet-500/20"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-fuchsia-500/20 to-transparent rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Productivity Score</span>
            </div>

            <div className="flex justify-center">
              <PremiumProgressRing
                value={data.productivityScore}
                size={180}
                strokeWidth={14}
                colorScheme="primary"
                label={data.productivityScore >= 80 ? 'Excellent!' : data.productivityScore >= 50 ? 'Good' : 'Keep going'}
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          <PremiumStatCard
            title="Current Streak"
            value={data.streaks.current}
            suffix=" days"
            icon={Flame}
            colorScheme="accent"
            description="Keep the momentum!"
            delay={0.1}
          />
          <PremiumStatCard
            title="Longest Streak"
            value={data.streaks.longest}
            suffix=" days"
            icon={Trophy}
            colorScheme="success"
            description="Personal best"
            delay={0.15}
          />
          <PremiumStatCard
            title="This Week"
            value={data.thisWeek.notes + data.thisWeek.links}
            icon={Activity}
            colorScheme="secondary"
            description={`${data.thisWeek.notes} notes, ${data.thisWeek.links} links`}
            trend={data.thisMonth.monthlyChange !== 0 ? {
              value: Math.abs(data.thisMonth.monthlyChange),
              isPositive: data.thisMonth.monthlyChange > 0
            } : undefined}
            delay={0.2}
          />
          <PremiumStatCard
            title="Active Goals"
            value={data.overview.activeGoals}
            icon={Target}
            colorScheme="primary"
            description={`${data.overview.completedGoals} completed`}
            delay={0.25}
          />
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/25">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Weekly Activity</h3>
                <p className="text-xs text-muted-foreground">Last 7 weeks</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span className="font-medium">Active</span>
            </div>
          </div>

          {hasActivity ? (
            <PremiumBarChart
              data={weeklyBarData}
              height={220}
              showValues
              showLabels
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Start creating to see activity</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Content Distribution */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Content Distribution</h3>
              <p className="text-xs text-muted-foreground">By category</p>
            </div>
          </div>

          {donutData.length > 0 && donutData.some(d => d.value > 0) ? (
            <div className="flex justify-center">
              <PremiumDonutChart
                data={donutData}
                size={200}
                strokeWidth={20}
                centerValue={data.overview.totalNotes + data.overview.totalLinks + data.overview.totalBoards}
                centerLabel="Total Items"
              />
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <div className="text-center">
                <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No content yet</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Most Active Days */}
      <motion.div
        variants={itemVariants}
        className="rounded-3xl p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Most Active Days</h3>
            <p className="text-xs text-muted-foreground">When you&apos;re most productive</p>
          </div>
        </div>

        {dayActivityData.some(d => d.value > 0) ? (
          <PremiumBarChart
            data={dayActivityData}
            height={180}
            showValues
            showLabels
          />
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Activity will appear as you use the app</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Lifetime Stats */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-lg">Lifetime Stats</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Notes', value: data.overview.totalNotes, icon: FileText, color: '#8b5cf6' },
            { label: 'Links', value: data.overview.totalLinks, icon: Link2, color: '#3b82f6' },
            { label: 'Boards', value: data.overview.totalBoards, icon: Grid3X3, color: '#f59e0b' },
            { label: 'Files', value: data.overview.totalFiles, icon: FolderOpen, color: '#10b981' },
            { label: 'Active Goals', value: data.overview.activeGoals, icon: Target, color: '#ec4899' },
            { label: 'Completed', value: data.overview.completedGoals, icon: CheckCircle2, color: '#06b6d4' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 text-center group"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                style={{ backgroundColor: stat.color }}
              />
              <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
              <div className="text-2xl font-bold">
                <AnimatedNumber value={stat.value} duration={1} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
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
} from 'lucide-react'
import { StatCardAnimated } from '@/components/charts/stat-card-animated'
import { cn } from '@/lib/utils'

// Lazy load 3D components to avoid SSR issues
const ProgressRing3D = lazy(() => import('@/components/charts/progress-ring-3d').then(m => ({ default: m.ProgressRing3D })))
const BarChart3D = lazy(() => import('@/components/charts/bar-chart-3d').then(m => ({ default: m.BarChart3D })))
const DonutChart3D = lazy(() => import('@/components/charts/donut-chart-3d').then(m => ({ default: m.DonutChart3D })))

// Fallback components
const ProgressRing2DFallback = lazy(() => import('@/components/charts/progress-ring-3d').then(m => ({ default: m.ProgressRing2DFallback })))
const BarChart2DFallback = lazy(() => import('@/components/charts/bar-chart-3d').then(m => ({ default: m.BarChart2DFallback })))

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

function getProductivityLevel(score: number): { label: string; color: string; glowClass: string } {
  if (score >= 80) return { label: 'On Fire!', color: 'amber', glowClass: 'glow-amber' }
  if (score >= 60) return { label: 'Great', color: 'green', glowClass: 'glow-green' }
  if (score >= 40) return { label: 'Good', color: 'blue', glowClass: 'glow-blue' }
  if (score >= 20) return { label: 'Getting Started', color: 'purple', glowClass: 'glow-purple' }
  return { label: 'Start Building!', color: 'amber', glowClass: '' }
}

// Check if WebGL is available
function useWebGLSupport() {
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      setSupported(!!gl)
    } catch {
      setSupported(false)
    }
  }, [])

  return supported
}

function ChartLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-[200px]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="w-8 h-8 text-amber-500" />
      </motion.div>
    </div>
  )
}

export function ProductivityAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const webGLSupported = useWebGLSupport()

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
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-8 h-8 text-amber-500" />
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Unable to load analytics</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { label, color, glowClass } = getProductivityLevel(data.productivityScore)
  const hasActivity = data.dailyActivity.some(d => d.notes > 0 || d.links > 0)

  // Prepare data for 3D charts
  const weeklyBarData = data.weeklyTrend.slice(-6).map((w, i) => ({
    label: w.week,
    value: w.notes + w.links,
    color: ['#f59e0b', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899', '#06b6d4'][i % 6],
  }))

  const dayActivityData = data.activityByDay.map((d, i) => ({
    label: d.day,
    value: d.count,
    color: ['#f59e0b', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899', '#06b6d4', '#ef4444'][i % 7],
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold">Productivity Analytics</h2>
          <p className="text-sm text-muted-foreground">Track your progress and insights</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="glass-card hover:glow-amber-subtle transition-all"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </motion.div>

      {/* Top Stats Row - 3D Progress + Streaks */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* 3D Productivity Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={cn('glass-card overflow-hidden', glowClass)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Productivity Score
              </CardTitle>
              <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartLoader />}>
                {webGLSupported ? (
                  <ProgressRing3D
                    value={data.productivityScore}
                    color={color as 'amber' | 'blue' | 'purple' | 'green'}
                    size="md"
                  />
                ) : (
                  <ProgressRing2DFallback
                    value={data.productivityScore}
                    color={color as 'amber' | 'blue' | 'purple' | 'green'}
                    size="md"
                  />
                )}
              </Suspense>
            </CardContent>
          </Card>
        </motion.div>

        {/* Streaks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <StatCardAnimated
            title="Current Streak"
            value={data.streaks.current}
            suffix=" days"
            icon={Flame}
            color="amber"
            description="Keep it going!"
            delay={0.2}
          />
          <StatCardAnimated
            title="Longest Streak"
            value={data.streaks.longest}
            suffix=" days"
            icon={Trophy}
            color="purple"
            description="Your personal best"
            delay={0.3}
          />
        </motion.div>

        {/* This Week Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <StatCardAnimated
            title="Notes This Week"
            value={data.thisWeek.notes}
            icon={FileText}
            color="blue"
            trend={data.thisMonth.monthlyChange !== 0 ? {
              value: Math.abs(data.thisMonth.monthlyChange),
              isPositive: data.thisMonth.monthlyChange > 0
            } : undefined}
            delay={0.4}
          />
          <StatCardAnimated
            title="Links Saved"
            value={data.thisWeek.links}
            icon={Link2}
            color="green"
            delay={0.5}
          />
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity 3D Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                Weekly Activity
              </CardTitle>
              <CardDescription>Your content creation over the past weeks</CardDescription>
            </CardHeader>
            <CardContent>
              {hasActivity ? (
                <Suspense fallback={<ChartLoader />}>
                  {webGLSupported ? (
                    <BarChart3D
                      data={weeklyBarData}
                      height={280}
                      showLabels
                      showValues
                      colorScheme="gradient"
                    />
                  ) : (
                    <BarChart2DFallback data={weeklyBarData} height={200} />
                  )}
                </Suspense>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Start creating to see your activity!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown 3D Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Content Distribution
              </CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              {data.categoryBreakdown.length > 0 ? (
                <Suspense fallback={<ChartLoader />}>
                  {webGLSupported ? (
                    <DonutChart3D
                      data={data.categoryBreakdown}
                      height={280}
                      centerValue={data.overview.totalNotes + data.overview.totalLinks}
                      centerLabel="Total Items"
                    />
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-4">
                        {data.categoryBreakdown.map((cat) => (
                          <div key={cat.name} className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm">{cat.name}: {cat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Suspense>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Grid3X3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No content yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity by Day */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Most Active Days
            </CardTitle>
            <CardDescription>When you create the most content</CardDescription>
          </CardHeader>
          <CardContent>
            {data.activityByDay.some(d => d.count > 0) ? (
              <Suspense fallback={<ChartLoader />}>
                {webGLSupported ? (
                  <BarChart3D
                    data={dayActivityData}
                    height={220}
                    showLabels
                    showValues
                    colorScheme="gradient"
                  />
                ) : (
                  <BarChart2DFallback data={dayActivityData} height={180} />
                )}
              </Suspense>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Activity will appear here as you use the app</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Lifetime Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Lifetime Stats
            </CardTitle>
            <CardDescription>Everything you&apos;ve created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCardAnimated
                title="Notes"
                value={data.overview.totalNotes}
                icon={FileText}
                color="blue"
                delay={0.8}
                className="h-auto"
              />
              <StatCardAnimated
                title="Links"
                value={data.overview.totalLinks}
                icon={Link2}
                color="purple"
                delay={0.85}
                className="h-auto"
              />
              <StatCardAnimated
                title="Boards"
                value={data.overview.totalBoards}
                icon={Grid3X3}
                color="amber"
                delay={0.9}
                className="h-auto"
              />
              <StatCardAnimated
                title="Files"
                value={data.overview.totalFiles}
                icon={FolderOpen}
                color="green"
                delay={0.95}
                className="h-auto"
              />
              <StatCardAnimated
                title="Active Goals"
                value={data.overview.activeGoals}
                icon={Target}
                color="blue"
                delay={1.0}
                className="h-auto"
              />
              <StatCardAnimated
                title="Completed"
                value={data.overview.completedGoals}
                icon={CheckCircle2}
                color="green"
                delay={1.05}
                className="h-auto"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

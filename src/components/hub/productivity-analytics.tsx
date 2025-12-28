'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
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
} from 'lucide-react'

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

function getProductivityLevel(score: number): { label: string; color: string; icon: typeof Flame } {
  if (score >= 80) return { label: 'On Fire!', color: 'text-orange-500', icon: Flame }
  if (score >= 60) return { label: 'Great', color: 'text-green-500', icon: Trophy }
  if (score >= 40) return { label: 'Good', color: 'text-blue-500', icon: Zap }
  if (score >= 20) return { label: 'Getting Started', color: 'text-yellow-500', icon: TrendingUp }
  return { label: 'Start Building!', color: 'text-muted-foreground', icon: Target }
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
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

  const { label, color, icon: ProductivityIcon } = getProductivityLevel(data.productivityScore)
  const hasActivity = data.dailyActivity.some(d => d.notes > 0 || d.links > 0)

  return (
    <div className="space-y-6">
      {/* Header with Score and Streaks */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productivity Score */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted/20"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(data.productivityScore / 100) * 201} 201`}
                    className="text-amber-500 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{data.productivityScore}</span>
                </div>
              </div>
              <div>
                <div className={`flex items-center gap-1.5 ${color}`}>
                  <ProductivityIcon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Productivity Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.streaks.current}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Longest Streak */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.streaks.longest}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Week Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Notes
                  </span>
                  <span className="font-semibold">{data.thisWeek.notes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Links
                  </span>
                  <span className="font-semibold">{data.thisWeek.links}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1 border-t">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Daily Activity
              </CardTitle>
              <CardDescription>Notes and links created over the last 30 days</CardDescription>
            </div>
            {data.thisMonth.monthlyChange !== 0 && (
              <Badge
                variant="outline"
                className={data.thisMonth.monthlyChange > 0 ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}
              >
                {data.thisMonth.monthlyChange > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(data.thisMonth.monthlyChange)}% vs last month
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasActivity ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNotes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLinks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="notes"
                    stroke="#3b82f6"
                    fill="url(#colorNotes)"
                    strokeWidth={2}
                    name="Notes"
                  />
                  <Area
                    type="monotone"
                    dataKey="links"
                    stroke="#8b5cf6"
                    fill="url(#colorLinks)"
                    strokeWidth={2}
                    name="Links"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No activity yet. Start creating notes and saving links!</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Trend & Category Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              Weekly Trend
            </CardTitle>
            <CardDescription>Activity over the last 12 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="notes" fill="#3b82f6" name="Notes" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="links" fill="#8b5cf6" name="Links" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="goals" fill="#f59e0b" name="Goals" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Content Breakdown
            </CardTitle>
            <CardDescription>Distribution of your content</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length > 0 ? (
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value) => [value ?? 0, 'Items']}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      formatter={(value) => <span className="text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No content yet. Start creating!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity by Day of Week */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Most Active Days
          </CardTitle>
          <CardDescription>When you create the most notes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.activityByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [value ?? 0, 'Notes']}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Notes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Lifetime Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Lifetime Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <div className="text-center">
              <FileText className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{data.overview.totalNotes}</p>
              <p className="text-xs text-muted-foreground">Notes</p>
            </div>
            <div className="text-center">
              <Link2 className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold">{data.overview.totalLinks}</p>
              <p className="text-xs text-muted-foreground">Links</p>
            </div>
            <div className="text-center">
              <FolderOpen className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{data.overview.totalFiles}</p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
            <div className="text-center">
              <Grid3X3 className="w-5 h-5 mx-auto mb-1 text-pink-500" />
              <p className="text-2xl font-bold">{data.overview.totalBoards}</p>
              <p className="text-xs text-muted-foreground">Boards</p>
            </div>
            <div className="text-center">
              <Target className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{data.overview.activeGoals}</p>
              <p className="text-xs text-muted-foreground">Active Goals</p>
            </div>
            <div className="text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{data.overview.completedGoals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

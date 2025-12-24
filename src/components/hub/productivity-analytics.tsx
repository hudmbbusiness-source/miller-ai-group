'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalNotes: number
    totalLinks: number
    totalBoards: number
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
  activityByDay: Array<{ day: string; count: number }>
  weeklyTrend: Array<{ week: string; notes: number }>
  productivityScore: number
}

function ActivityBar({ count, maxCount }: { count: number; maxCount: number }) {
  const height = maxCount === 0 ? 0 : Math.max(4, (count / maxCount) * 100)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 bg-muted rounded-t relative overflow-hidden" style={{ height: '60px' }}>
        <div
          className="absolute bottom-0 left-0 right-0 bg-amber-500 rounded-t transition-all duration-300"
          style={{ height: `${height}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  )
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
  const maxDayCount = Math.max(...data.activityByDay.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Productivity Score */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              Productivity Analytics
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(data.productivityScore / 100) * 251.2} 251.2`}
                  className="text-amber-500 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{data.productivityScore}</span>
              </div>
            </div>
            <div>
              <div className={`flex items-center gap-2 ${color}`}>
                <ProductivityIcon className="w-5 h-5" />
                <span className="font-semibold">{label}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Weekly productivity score
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <FileText className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold">{data.thisWeek.notes}</p>
              <p className="text-xs text-muted-foreground">Notes This Week</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Link2 className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-lg font-bold">{data.thisWeek.links}</p>
              <p className="text-xs text-muted-foreground">Links This Week</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Target className="w-4 h-4 mx-auto mb-1 text-green-500" />
              <p className="text-lg font-bold">{data.overview.activeGoals}</p>
              <p className="text-xs text-muted-foreground">Active Goals</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              <p className="text-lg font-bold">{data.overview.completedGoals}</p>
              <p className="text-xs text-muted-foreground">Goals Done</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Breakdown */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Activity by Day */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              Activity by Day
            </CardTitle>
            <CardDescription>Notes created this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end gap-2 pt-4">
              {data.activityByDay.map((day) => (
                <div key={day.day} className="flex flex-col items-center gap-1">
                  <ActivityBar count={day.count} maxCount={maxDayCount} />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Monthly Summary
            </CardTitle>
            <CardDescription>Your progress this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Notes Created</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{data.thisMonth.notes}</span>
                {data.thisMonth.monthlyChange !== 0 && (
                  <Badge
                    variant="outline"
                    className={data.thisMonth.monthlyChange > 0 ? 'text-green-500' : 'text-red-500'}
                  >
                    {data.thisMonth.monthlyChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(data.thisMonth.monthlyChange)}%
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Links Saved</span>
              </div>
              <span className="font-semibold">{data.thisMonth.links}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                <span className="text-sm">Files Uploaded</span>
              </div>
              <span className="font-semibold">{data.thisMonth.files}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifetime Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Lifetime Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{data.overview.totalNotes}</p>
              <p className="text-xs text-muted-foreground">Total Notes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-500">{data.overview.totalLinks}</p>
              <p className="text-xs text-muted-foreground">Total Links</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{data.overview.totalBoards}</p>
              <p className="text-xs text-muted-foreground">Boards</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{data.overview.activeGoals}</p>
              <p className="text-xs text-muted-foreground">Active Goals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{data.overview.completedGoals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

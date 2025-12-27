'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
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

// Owner email - only this user has full access to Kachow AI system
const OWNER_EMAIL = 'kachowapp@gmail.com'

const features = [
  {
    icon: TrendingUp,
    title: 'Algorithm-Driven Editing',
    description: 'Analyzes YouTube algorithm trends to identify what content performs best',
  },
  {
    icon: Scissors,
    title: 'Auto-Clip Generation',
    description: 'Automatically extracts viral-worthy moments from long-form content',
  },
  {
    icon: Sparkles,
    title: 'Smart Optimization',
    description: 'Optimizes clips for maximum engagement across social platforms',
  },
  {
    icon: Video,
    title: 'Multi-Platform Export',
    description: 'Export optimized content for YouTube Shorts, TikTok, and Instagram Reels',
  },
]

// Owner-only dashboard component
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
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10">
            <Zap className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Kachow AI Dashboard</h1>
            <p className="text-muted-foreground">Admin Control Panel</p>
          </div>
        </div>
        <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
          <Lock className="w-3 h-3 mr-1" />
          Owner Access
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{earlyAccessStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Early Access Signups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Youtube className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Videos Processed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Clips Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0h</p>
                <p className="text-xs text-muted-foreground">Time Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Early Access Signups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Early Access Signups</CardTitle>
            <CardDescription>Users who signed up for early access</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEarlyAccessStats}
            disabled={loadingStats}
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
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : earlyAccessStats && earlyAccessStats.signups.length > 0 ? (
            <div className="space-y-3">
              {earlyAccessStats.signups.slice(0, 10).map((signup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{signup.full_name || 'Anonymous'}</p>
                    <p className="text-sm text-muted-foreground">{signup.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {signup.access_code}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(signup.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {earlyAccessStats.signups.length > 10 && (
                <p className="text-sm text-center text-muted-foreground pt-2">
                  +{earlyAccessStats.signups.length - 10} more signups
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No signups yet</p>
              <p className="text-sm">Share your Instagram post to get early access signups</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <CardTitle>System Status</CardTitle>
          </div>
          <CardDescription>
            Kachow AI is in active development. YouTube API integration and video processing
            pipelines are being built.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Supabase Database</span>
              <Badge variant="outline" className="ml-auto text-xs">Connected</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Early Access API</span>
              <Badge variant="outline" className="ml-auto text-xs">Active</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>YouTube API</span>
              <Badge variant="outline" className="ml-auto text-xs">In Progress</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Video Processing</span>
              <Badge variant="outline" className="ml-auto text-xs">In Progress</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Landing Page
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
              <Instagram className="w-4 h-4 mr-2" />
              @kachowai
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app/admin/verify">
              <Settings className="w-4 h-4 mr-2" />
              System Verify
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Non-owner view
function PublicView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-500/10">
          <Zap className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Kachow AI</h1>
          <p className="text-muted-foreground">AI auto-editing powered by algorithmic data</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-amber-500/10 text-amber-500 border-amber-500/30">
          In Development
        </Badge>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About Kachow AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Kachow AI is an advanced auto-editing platform that leverages real-time YouTube algorithmic data
            to identify viral moments in long-form content. The system automatically generates optimized
            short-form clips designed for maximum engagement and distribution across social platforms.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-2 rounded-lg bg-amber-500/10 h-fit">
                  <feature.icon className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Development Status */}
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-amber-500" />
              <CardTitle>Currently In Development</CardTitle>
            </div>
          </div>
          <CardDescription>
            Kachow AI is being actively developed. The core AI editing engine, YouTube data integration,
            and export pipelines are under construction. Follow our progress on Instagram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="gap-2">
            <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
              <Instagram className="w-4 h-4" />
              Follow @kachowai
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Target Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Target Use Cases</CardTitle>
          <CardDescription>Who Kachow AI is designed for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">YouTube Creators</Badge>
            <Badge variant="outline">Podcast Editors</Badge>
            <Badge variant="outline">Content Agencies</Badge>
            <Badge variant="outline">Social Media Managers</Badge>
            <Badge variant="outline">Video Editors</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Designed to save hours of manual editing by automating clip selection and optimization
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/">
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Kachow.app
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
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
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  // Check if user is the owner
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()

  if (isOwner) {
    return <OwnerDashboard user={user} />
  }

  return <PublicView />
}

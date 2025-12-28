'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Github,
  RefreshCw,
  GitCommit,
  Star,
  GitFork,
  Code,
  Calendar,
  TrendingUp,
  ExternalLink,
  AlertCircle,
  Loader2,
  Settings,
  GitPullRequest,
  Bug,
  Eye,
  Flame,
  Award,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface GitHubStats {
  user: {
    login: string
    name: string
    avatar_url: string
    bio?: string
    public_repos: number
    private_repos?: number
    total_repos?: number
    followers: number
    following: number
    created_at: string
    company?: string
    location?: string
    blog?: string
    twitter_username?: string
  }
  repos: Array<{
    name: string
    description: string
    html_url: string
    stargazers_count: number
    forks_count: number
    language: string
    updated_at: string
    pushed_at?: string
    topics: string[]
    size?: number
    isPrivate?: boolean
    isFork?: boolean
  }>
  contributions: {
    total: number
    lastWeek: number
    commits?: number
    pullRequests?: number
    issues?: number
    reviews?: number
    calendar?: Array<{ date: string; count: number; level: number }>
    streak?: { current: number; longest: number }
  }
  languageDistribution?: Array<{
    name: string
    count: number
    percentage: number
    sizePercentage: number
  }>
  repoActivity?: {
    activeThisWeek: number
    activeThisMonth: number
    total: number
    forked: number
    original: number
  }
  repoStats?: {
    totalStars: number
    totalForks: number
    totalSize: number
    avgSize: number
  }
  auth?: {
    authenticated: boolean
    hasPrivateAccess: boolean
    tokenSource: 'oauth' | 'env' | 'none'
  }
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
        'border border-border/50 hover:border-violet-500/20',
        'transition-all duration-300',
        'shadow-lg',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export function GitHubDashboard() {
  const [stats, setStats] = useState<GitHubStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [username, setUsername] = useState<string>('')
  const [tempUsername, setTempUsername] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchUsername = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const githubUsername = user.user_metadata?.user_name ||
                               user.user_metadata?.preferred_username ||
                               user.user_metadata?.login

        if (githubUsername) {
          setUsername(githubUsername)
          setTempUsername(githubUsername)
          // @ts-expect-error - Supabase types not fully inferred
          await supabase.from('site_content').upsert({
            key: 'github_username',
            value: githubUsername,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key,user_id' })
          setLoading(false)
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('site_content') as any)
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'github_username')
          .single()

        if (data?.value) {
          setUsername(data.value)
          setTempUsername(data.value)
        }
      }
      setLoading(false)
    }

    fetchUsername()
  }, [])

  const saveUsername = async () => {
    if (!tempUsername.trim()) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // @ts-expect-error - Supabase types not fully inferred
      await supabase.from('site_content').upsert({
        key: 'github_username',
        value: tempUsername.trim(),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key,user_id' })
      setUsername(tempUsername.trim())
    }
    setSaving(false)
  }

  const fetchGitHubStats = useCallback(async () => {
    if (!username) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/github/stats?username=${username}`)
      if (!res.ok) throw new Error('Failed to fetch GitHub stats')
      const data = await res.json()
      setStats(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to load GitHub stats. Check your username and try again.')
      console.error('GitHub Stats Error:', err)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    if (username) {
      fetchGitHubStats()
    }
  }, [username, fetchGitHubStats])

  const getLanguageColor = (language: string): string => {
    const colors: Record<string, string> = {
      TypeScript: 'from-blue-500 to-blue-600',
      JavaScript: 'from-yellow-400 to-yellow-500',
      Python: 'from-green-500 to-green-600',
      Rust: 'from-orange-500 to-orange-600',
      Go: 'from-cyan-400 to-cyan-500',
      Java: 'from-red-500 to-red-600',
      'C++': 'from-pink-500 to-pink-600',
      C: 'from-gray-500 to-gray-600',
      'C#': 'from-purple-500 to-purple-600',
      Ruby: 'from-red-400 to-red-500',
      Swift: 'from-orange-400 to-orange-500',
      Kotlin: 'from-purple-400 to-purple-500',
      PHP: 'from-indigo-500 to-indigo-600',
      Shell: 'from-green-400 to-green-500',
      HTML: 'from-orange-500 to-orange-600',
      CSS: 'from-blue-400 to-blue-500',
      Vue: 'from-emerald-500 to-emerald-600',
      Svelte: 'from-orange-500 to-orange-600',
    }
    return colors[language] || 'from-gray-400 to-gray-500'
  }

  const getLanguageBgColor = (language: string): string => {
    const colors: Record<string, string> = {
      TypeScript: 'bg-blue-500',
      JavaScript: 'bg-yellow-500',
      Python: 'bg-green-600',
      Rust: 'bg-orange-600',
      Go: 'bg-cyan-500',
      Java: 'bg-red-500',
      'C++': 'bg-pink-500',
      C: 'bg-gray-500',
      'C#': 'bg-purple-600',
      Ruby: 'bg-red-400',
      Swift: 'bg-orange-400',
      Kotlin: 'bg-purple-500',
      PHP: 'bg-indigo-500',
      Shell: 'bg-green-400',
      HTML: 'bg-orange-500',
      CSS: 'bg-blue-400',
      Vue: 'bg-emerald-500',
    }
    return colors[language] || 'bg-gray-400'
  }

  // Setup screen
  if (!username && !loading) {
    return (
      <PremiumCard className="border-dashed border-violet-500/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 mb-6"
          >
            <Github className="w-10 h-10 text-white" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">Connect Your GitHub</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Enter your GitHub username to display your profile, repositories, and contribution stats.
          </p>
          <div className="flex gap-2 w-full max-w-sm">
            <Input
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="your-github-username"
              className="flex-1 bg-muted/50 border-violet-500/20 focus:border-violet-500/50"
            />
            <Button
              onClick={saveUsername}
              disabled={saving || !tempUsername.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You can also set this in{' '}
            <Link href="/app/settings" className="text-violet-500 hover:underline">
              Settings
            </Link>
          </p>
        </CardContent>
      </PremiumCard>
    )
  }

  if (loading && !stats) {
    return (
      <PremiumCard className="border-violet-500/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-10 h-10 text-violet-500" />
          </motion.div>
          <p className="text-muted-foreground mt-4">Loading GitHub stats...</p>
        </CardContent>
      </PremiumCard>
    )
  }

  if (error && !stats) {
    return (
      <PremiumCard className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="p-3 rounded-xl bg-destructive/10 mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-muted-foreground mb-2">{error}</p>
          <p className="text-sm text-muted-foreground mb-4">Username: {username}</p>
          <div className="flex gap-2">
            <Button onClick={fetchGitHubStats} variant="outline" className="hover:border-violet-500/50 hover:text-violet-500">
              Try Again
            </Button>
            <Button onClick={() => setUsername('')} variant="ghost">
              Change Username
            </Button>
          </div>
        </CardContent>
      </PremiumCard>
    )
  }

  if (!stats) return null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Profile Overview */}
      <motion.div variants={itemVariants}>
        <PremiumCard>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                  <Github className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg">GitHub Profile</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUsername('')}
                  title="Change username"
                  className="hover:bg-violet-500/10 hover:text-violet-500"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchGitHubStats}
                  disabled={loading}
                  className="hover:bg-violet-500/10 hover:text-violet-500"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            {lastUpdated && (
              <CardDescription className="text-xs">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Image
                  src={stats.user.avatar_url}
                  alt={stats.user.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full ring-2 ring-violet-500/30"
                  unoptimized
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Github className="w-3 h-3 text-white" />
                </div>
              </motion.div>
              <div>
                <h3 className="font-semibold text-lg">{stats.user.name}</h3>
                <a
                  href={`https://github.com/${stats.user.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-violet-500 flex items-center gap-1 transition-colors"
                >
                  @{stats.user.login}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Auth status */}
            {stats.auth && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2',
                  stats.auth.authenticated
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                )}
              >
                {stats.auth.authenticated ? (
                  <>
                    <Github className="w-4 h-4" />
                    Connected via GitHub OAuth
                    {stats.auth.hasPrivateAccess && ' • Private repo access'}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Limited access - Re-login for full stats
                  </>
                )}
              </motion.div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Code, value: stats.user.total_repos || stats.user.public_repos, label: stats.user.private_repos ? `${stats.user.public_repos} public, ${stats.user.private_repos} private` : 'Repositories', color: 'violet' },
                { icon: Star, value: stats.repos.reduce((acc, r) => acc + r.stargazers_count, 0), label: 'Total Stars', color: 'amber' },
                { icon: GitCommit, value: stats.contributions.total, label: 'Contributions', color: 'emerald' },
                { icon: TrendingUp, value: stats.contributions.lastWeek, label: 'This Week', color: 'cyan' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={cn(
                    'text-center p-4 rounded-xl border transition-all duration-300',
                    stat.color === 'violet' && 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40',
                    stat.color === 'amber' && 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
                    stat.color === 'emerald' && 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40',
                    stat.color === 'cyan' && 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40'
                  )}
                >
                  <stat.icon className={cn(
                    'w-5 h-5 mx-auto mb-2',
                    stat.color === 'violet' && 'text-violet-500',
                    stat.color === 'amber' && 'text-amber-500',
                    stat.color === 'emerald' && 'text-emerald-500',
                    stat.color === 'cyan' && 'text-cyan-500'
                  )} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </PremiumCard>
      </motion.div>

      {/* Top Repositories */}
      <motion.div variants={itemVariants}>
        <PremiumCard>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/25">
                <GitFork className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Top Repositories</CardTitle>
                <CardDescription>Most active and starred projects</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.repos.slice(0, 6).map((repo, index) => (
                <motion.div
                  key={repo.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ x: 4 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-transparent hover:border-violet-500/20 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-violet-500 flex items-center gap-1 transition-colors"
                      >
                        {repo.name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {repo.topics.slice(0, 4).map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-xs bg-violet-500/10 text-violet-500 border-violet-500/20">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {repo.language && (
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${getLanguageBgColor(repo.language)}`} />
                          <span className="text-xs text-muted-foreground">{repo.language}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3.5 h-3.5 text-purple-500" />
                          {repo.forks_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </PremiumCard>
      </motion.div>

      {/* Contribution Breakdown */}
      {stats.contributions.commits !== undefined && (
        <motion.div variants={itemVariants}>
          <PremiumCard>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/25">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Contribution Breakdown</CardTitle>
                  <CardDescription>This year&apos;s activity across different contribution types</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: GitCommit, value: stats.contributions.commits, label: 'Commits', color: 'emerald' },
                  { icon: GitPullRequest, value: stats.contributions.pullRequests, label: 'Pull Requests', color: 'purple' },
                  { icon: Bug, value: stats.contributions.issues, label: 'Issues', color: 'orange' },
                  { icon: Eye, value: stats.contributions.reviews, label: 'Reviews', color: 'blue' },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      'text-center p-4 rounded-xl border transition-all',
                      stat.color === 'emerald' && 'bg-emerald-500/10 border-emerald-500/20',
                      stat.color === 'purple' && 'bg-purple-500/10 border-purple-500/20',
                      stat.color === 'orange' && 'bg-orange-500/10 border-orange-500/20',
                      stat.color === 'blue' && 'bg-blue-500/10 border-blue-500/20'
                    )}
                  >
                    <stat.icon className={cn(
                      'w-5 h-5 mx-auto mb-1',
                      stat.color === 'emerald' && 'text-emerald-500',
                      stat.color === 'purple' && 'text-purple-500',
                      stat.color === 'orange' && 'text-orange-500',
                      stat.color === 'blue' && 'text-blue-500'
                    )} />
                    <p className={cn(
                      'text-2xl font-bold',
                      stat.color === 'emerald' && 'text-emerald-500',
                      stat.color === 'purple' && 'text-purple-500',
                      stat.color === 'orange' && 'text-orange-500',
                      stat.color === 'blue' && 'text-blue-500'
                    )}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Streak Info */}
              {stats.contributions.streak && (
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20"
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-500">{stats.contributions.streak.current}</p>
                      <p className="text-xs text-muted-foreground">Day Current Streak</p>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20"
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/25">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-500">{stats.contributions.streak.longest}</p>
                      <p className="text-xs text-muted-foreground">Day Longest Streak</p>
                    </div>
                  </motion.div>
                </div>
              )}
            </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Contribution Calendar */}
      {stats.contributions.calendar && stats.contributions.calendar.length > 0 && (
        <motion.div variants={itemVariants}>
          <PremiumCard>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-500/25">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Last 12 weeks of contributions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 flex-wrap">
                {stats.contributions.calendar.map((day, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.005 }}
                    title={`${day.date}: ${day.count} contributions`}
                    className={cn(
                      'w-3 h-3 rounded-sm transition-all hover:scale-125',
                      day.level === 0 && 'bg-muted',
                      day.level === 1 && 'bg-emerald-200 dark:bg-emerald-900',
                      day.level === 2 && 'bg-emerald-400 dark:bg-emerald-700',
                      day.level === 3 && 'bg-emerald-500',
                      day.level === 4 && 'bg-emerald-600 dark:bg-emerald-400'
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-sm bg-muted" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Language Distribution */}
      {stats.languageDistribution && stats.languageDistribution.length > 0 && (
        <motion.div variants={itemVariants}>
          <PremiumCard>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Language Distribution</CardTitle>
                  <CardDescription>Languages used across your repositories</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.languageDistribution.map((lang, index) => (
                  <motion.div
                    key={lang.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${getLanguageColor(lang.name)}`} />
                        <span className="font-medium">{lang.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {lang.count} {lang.count === 1 ? 'repo' : 'repos'} ({lang.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${lang.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * index }}
                        className={`h-full rounded-full bg-gradient-to-r ${getLanguageColor(lang.name)}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Repository Activity & Stats */}
      {(stats.repoActivity || stats.repoStats) && (
        <div className="grid sm:grid-cols-2 gap-6">
          {stats.repoActivity && (
            <motion.div variants={itemVariants}>
              <PremiumCard className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-500/25">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">Repository Activity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Active this week', value: stats.repoActivity.activeThisWeek, color: 'emerald' },
                    { label: 'Active this month', value: stats.repoActivity.activeThisMonth, color: 'blue' },
                    { label: 'Original repositories', value: stats.repoActivity.original, color: 'violet' },
                    { label: 'Forked repositories', value: stats.repoActivity.forked, color: 'gray' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{item.label}</span>
                      <Badge variant="secondary" className={cn(
                        item.color === 'emerald' && 'bg-emerald-500/10 text-emerald-500',
                        item.color === 'blue' && 'bg-blue-500/10 text-blue-500',
                        item.color === 'violet' && 'bg-violet-500/10 text-violet-500',
                        item.color === 'gray' && ''
                      )}>
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </PremiumCard>
            </motion.div>
          )}

          {stats.repoStats && (
            <motion.div variants={itemVariants}>
              <PremiumCard className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/25">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">Repository Stats</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Total Stars', value: stats.repoStats.totalStars, icon: Star, color: 'amber' },
                    { label: 'Total Forks', value: stats.repoStats.totalForks, icon: GitFork, color: 'purple' },
                    { label: 'Total Code Size', value: stats.repoStats.totalSize > 1000 ? `${(stats.repoStats.totalSize / 1024).toFixed(1)} MB` : `${stats.repoStats.totalSize} KB`, icon: null, color: 'gray' },
                    { label: 'Avg Repo Size', value: stats.repoStats.avgSize > 1000 ? `${(stats.repoStats.avgSize / 1024).toFixed(1)} MB` : `${stats.repoStats.avgSize} KB`, icon: null, color: 'gray' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm flex items-center gap-2">
                        {item.icon && <item.icon className={cn(
                          'w-4 h-4',
                          item.color === 'amber' && 'text-amber-500',
                          item.color === 'purple' && 'text-purple-500'
                        )} />}
                        {item.label}
                      </span>
                      <Badge variant="secondary" className={cn(
                        item.color === 'amber' && 'bg-amber-500/10 text-amber-500',
                        item.color === 'purple' && 'bg-purple-500/10 text-purple-500',
                        item.color === 'gray' && ''
                      )}>
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </PremiumCard>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}

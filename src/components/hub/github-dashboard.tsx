'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  MapPin,
  Building2,
  Twitter,
  Globe,
  Lock,
} from 'lucide-react'
import Link from 'next/link'

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

export function GitHubDashboard() {
  const [stats, setStats] = useState<GitHubStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [username, setUsername] = useState<string>('')
  const [tempUsername, setTempUsername] = useState('')
  const [saving, setSaving] = useState(false)

  // Fetch GitHub username - first from OAuth metadata, then from site_content
  useEffect(() => {
    const fetchUsername = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // First check if user logged in with GitHub OAuth - get username from metadata
        const githubUsername = user.user_metadata?.user_name ||
                               user.user_metadata?.preferred_username ||
                               user.user_metadata?.login

        if (githubUsername) {
          setUsername(githubUsername)
          setTempUsername(githubUsername)

          // Also save to site_content for future reference
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

        // Fallback: check site_content for manually saved username
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

  const fetchGitHubStats = async () => {
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
  }

  useEffect(() => {
    if (username) {
      fetchGitHubStats()
    }
  }, [username])

  const getLanguageColor = (language: string): string => {
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
      Bash: 'bg-green-400',
      HTML: 'bg-orange-500',
      CSS: 'bg-blue-400',
      SCSS: 'bg-pink-400',
      Vue: 'bg-emerald-500',
      Svelte: 'bg-orange-500',
      Dart: 'bg-sky-500',
      Elixir: 'bg-purple-400',
      Haskell: 'bg-violet-500',
      Scala: 'bg-red-600',
      Lua: 'bg-indigo-400',
      R: 'bg-blue-600',
      Julia: 'bg-purple-500',
      Zig: 'bg-amber-500',
      Dockerfile: 'bg-blue-400',
      Makefile: 'bg-gray-600',
      Jupyter: 'bg-orange-400',
    }
    return colors[language] || 'bg-gray-400'
  }

  // Show setup if no username configured
  if (!username && !loading) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Github className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Your GitHub</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Enter your GitHub username to display your profile, repositories, and contribution stats.
          </p>
          <div className="flex gap-2 w-full max-w-sm">
            <Input
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="your-github-username"
              className="flex-1"
            />
            <Button onClick={saveUsername} disabled={saving || !tempUsername.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You can also set this in{' '}
            <Link href="/app/settings" className="text-primary hover:underline">
              Settings
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading && !stats) {
    return (
      <Card className="border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground mt-4">Loading GitHub stats...</p>
        </CardContent>
      </Card>
    )
  }

  if (error && !stats) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-10 h-10 text-destructive mb-4" />
          <p className="text-muted-foreground mb-2">{error}</p>
          <p className="text-sm text-muted-foreground mb-4">Username: {username}</p>
          <div className="flex gap-2">
            <Button onClick={fetchGitHubStats} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => setUsername('')} variant="ghost">
              Change Username
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Github className="w-5 h-5" />
              GitHub Profile
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setUsername('')} title="Change username">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchGitHubStats} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <CardDescription>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <img
              src={stats.user.avatar_url}
              alt={stats.user.name}
              className="w-16 h-16 rounded-full border-2 border-primary/20"
            />
            <div>
              <h3 className="font-semibold text-lg">{stats.user.name}</h3>
              <a
                href={`https://github.com/${stats.user.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                @{stats.user.login}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Auth status indicator */}
          {stats.auth && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
              stats.auth.authenticated
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
            }`}>
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
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Code className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">
                {stats.user.total_repos || stats.user.public_repos}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.user.private_repos ? `${stats.user.public_repos} public, ${stats.user.private_repos} private` : 'Repositories'}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">
                {stats.repos.reduce((acc, r) => acc + r.stargazers_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Stars</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <GitCommit className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{stats.contributions.total}</p>
              <p className="text-xs text-muted-foreground">Contributions</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{stats.contributions.lastWeek}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Repositories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitFork className="w-5 h-5 text-purple-500" />
            Top Repositories
          </CardTitle>
          <CardDescription>
            Most active and starred projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.repos.slice(0, 6).map((repo) => (
              <div
                key={repo.name}
                className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary flex items-center gap-1"
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
                          <Badge key={topic} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {repo.language && (
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${getLanguageColor(repo.language)}`} />
                        <span className="text-xs text-muted-foreground">{repo.language}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3" />
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <GitFork className="w-3 h-3" />
                        {repo.forks_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contribution Breakdown */}
      {stats.contributions.commits !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Contribution Breakdown
            </CardTitle>
            <CardDescription>
              This year&apos;s activity across different contribution types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <GitCommit className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold text-green-500">{stats.contributions.commits}</p>
                <p className="text-xs text-muted-foreground">Commits</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <GitPullRequest className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <p className="text-2xl font-bold text-purple-500">{stats.contributions.pullRequests}</p>
                <p className="text-xs text-muted-foreground">Pull Requests</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Bug className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                <p className="text-2xl font-bold text-orange-500">{stats.contributions.issues}</p>
                <p className="text-xs text-muted-foreground">Issues</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Eye className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold text-blue-500">{stats.contributions.reviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>

            {/* Streak Info */}
            {stats.contributions.streak && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Flame className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{stats.contributions.streak.current}</p>
                    <p className="text-xs text-muted-foreground">Day Current Streak</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Award className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-500">{stats.contributions.streak.longest}</p>
                    <p className="text-xs text-muted-foreground">Day Longest Streak</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contribution Calendar (Mini Heatmap) */}
      {stats.contributions.calendar && stats.contributions.calendar.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 12 weeks of contributions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap">
              {stats.contributions.calendar.map((day, i) => (
                <div
                  key={i}
                  title={`${day.date}: ${day.count} contributions`}
                  className={`w-3 h-3 rounded-sm ${
                    day.level === 0 ? 'bg-muted' :
                    day.level === 1 ? 'bg-green-200 dark:bg-green-900' :
                    day.level === 2 ? 'bg-green-400 dark:bg-green-700' :
                    day.level === 3 ? 'bg-green-500 dark:bg-green-500' :
                    'bg-green-600 dark:bg-green-400'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
                <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
              </div>
              <span>More</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Language Distribution */}
      {stats.languageDistribution && stats.languageDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-500" />
              Language Distribution
            </CardTitle>
            <CardDescription>Languages used across your repositories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.languageDistribution.map((lang) => (
                <div key={lang.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${getLanguageColor(lang.name)}`} />
                      <span className="font-medium">{lang.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {lang.count} {lang.count === 1 ? 'repo' : 'repos'} ({lang.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getLanguageColor(lang.name)}`}
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repository Activity & Stats */}
      {(stats.repoActivity || stats.repoStats) && (
        <div className="grid sm:grid-cols-2 gap-6">
          {stats.repoActivity && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                  Repository Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Active this week</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    {stats.repoActivity.activeThisWeek}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Active this month</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                    {stats.repoActivity.activeThisMonth}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Original repositories</span>
                  <Badge variant="secondary">{stats.repoActivity.original}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Forked repositories</span>
                  <Badge variant="outline">{stats.repoActivity.forked}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.repoStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Repository Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Total Stars
                  </span>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                    {stats.repoStats.totalStars}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-purple-500" />
                    Total Forks
                  </span>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                    {stats.repoStats.totalForks}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Total Code Size</span>
                  <Badge variant="outline">
                    {stats.repoStats.totalSize > 1000
                      ? `${(stats.repoStats.totalSize / 1024).toFixed(1)} MB`
                      : `${stats.repoStats.totalSize} KB`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Avg Repo Size</span>
                  <Badge variant="outline">
                    {stats.repoStats.avgSize > 1000
                      ? `${(stats.repoStats.avgSize / 1024).toFixed(1)} MB`
                      : `${stats.repoStats.avgSize} KB`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

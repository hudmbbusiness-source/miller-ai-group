import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PROJECTS } from '@/types'
import {
  FileText,
  Grid3X3,
  Link2,
  FolderOpen,
  Plus,
  ExternalLink,
  Target,
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Github,
  Sparkles,
} from 'lucide-react'
import { GitHubDashboard } from '@/components/hub/github-dashboard'
import { ProductivityAnalytics } from '@/components/hub/productivity-analytics'
import { ActivityFeed } from '@/components/hub/activity-feed'
import {
  AnimatedDashboardHeader,
  AnimatedStatCards,
  AnimatedSectionHeader,
  AnimatedCard,
  AnimatedQuickActions,
} from '@/components/hub/dashboard-client'
import type { Goal } from '@/lib/actions/goals'
import type { Asset } from '@/lib/actions/assets'

const statusColors: Record<string, string> = {
  'active': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  'development': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  'coming-soon': 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  'past': 'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

const statusLabels: Record<string, string> = {
  'active': 'Active',
  'development': 'In Development',
  'coming-soon': 'Coming Soon',
  'past': 'Past Venture',
}

const priorityColors = {
  0: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
  1: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  2: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
}

const priorityLabels = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
}

async function getStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { notes: 0, boards: 0, links: 0, files: 0 }

  const [notesResult, boardsResult, linksResult, filesResult] = await Promise.all([
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('boards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('saved_links').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('files_index').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  return {
    notes: notesResult.count ?? 0,
    boards: boardsResult.count ?? 0,
    links: linksResult.count ?? 0,
    files: filesResult.count ?? 0,
  }
}

async function getActiveGoals(): Promise<Goal[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('goals') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('priority', { ascending: false })
    .order('order_index')
    .limit(5)

  return (data || []) as Goal[]
}

async function getWishlistItems(): Promise<Asset[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('assets') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('category', 'want')
    .order('priority', { ascending: false })
    .order('order_index')
    .limit(5)

  return (data || []) as Asset[]
}

export default async function DashboardPage() {
  const [stats, activeGoals, wishlistItems] = await Promise.all([
    getStats(),
    getActiveGoals(),
    getWishlistItems(),
  ])

  const statCards = [
    { label: 'Notes', count: stats.notes, href: '/app/notes' },
    { label: 'Boards', count: stats.boards, href: '/app/boards' },
    { label: 'Links', count: stats.links, href: '/app/links' },
    { label: 'Files', count: stats.files, href: '/app/files' },
  ]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <AnimatedDashboardHeader
        title="Dashboard"
        subtitle="Welcome back to your personal hub."
      />

      {/* Stats Cards */}
      <AnimatedStatCards stats={statCards} />

      {/* Goals & Wishlist Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Goals */}
        <AnimatedCard delay={0.1}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg">Active Goals</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-violet-500 hover:text-violet-400 hover:bg-violet-500/10">
                <Link href="/app/goals">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                  <Target className="w-8 h-8 text-violet-500/50" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">No active goals yet</p>
                <Button asChild size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0">
                  <Link href="/app/goals?new=true">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Goal
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 hover:from-violet-500/10 hover:to-purple-500/5 border border-transparent hover:border-violet-500/20 transition-all duration-300"
                  >
                    <div className="mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-violet-500/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{goal.title}</p>
                      {goal.target_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(goal.target_date)}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={priorityColors[goal.priority as 0 | 1 | 2]}>
                      {priorityLabels[goal.priority as 0 | 1 | 2]}
                    </Badge>
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="w-full hover:bg-violet-500/10 hover:text-violet-500">
                  <Link href="/app/goals?new=true">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Goal
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </AnimatedCard>

        {/* Wishlist */}
        <AnimatedCard delay={0.2}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-lg">Wishlist</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                <Link href="/app/assets">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {wishlistItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-amber-500/50" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Nothing on wishlist yet</p>
                <Button asChild size="sm" className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white border-0">
                  <Link href="/app/assets?new=true">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {wishlistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 hover:from-amber-500/10 hover:to-orange-500/5 border border-transparent hover:border-amber-500/20 transition-all duration-300"
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg object-cover ring-1 ring-border/50"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-amber-500/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.external_link && (
                      <a
                        href={item.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-amber-500 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="w-full hover:bg-amber-500/10 hover:text-amber-500">
                  <Link href="/app/assets?new=true">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Activity Feed */}
      <ActivityFeed />

      {/* Productivity Analytics */}
      <div>
        <AnimatedSectionHeader
          title="Productivity Analytics"
          icon={<Sparkles className="w-5 h-5 text-violet-500" />}
          className="mb-4"
        />
        <ProductivityAnalytics />
      </div>

      {/* GitHub Section */}
      <div>
        <AnimatedSectionHeader
          title="GitHub Activity"
          icon={<Github className="w-5 h-5 text-foreground" />}
          className="mb-4"
        />
        <GitHubDashboard />
      </div>

      {/* Projects Section */}
      <div>
        <AnimatedSectionHeader
          title="Ventures"
          className="mb-4"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          {PROJECTS.map((project, index) => (
            <AnimatedCard key={project.slug} delay={index * 0.1}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant="outline" className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="hover:border-violet-500/50 hover:text-violet-500">
                  <Link href={`/app/projects/${project.slug}`}>
                    Open Project Page
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </AnimatedCard>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <AnimatedSectionHeader
          title="Quick Actions"
          className="mb-4"
        />
        <AnimatedQuickActions>
          <Button asChild className="h-10 sm:h-9 text-sm bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/25">
            <Link href="/app/notes?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              New Note
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm hover:border-violet-500/50 hover:text-violet-500 hover:bg-violet-500/5">
            <Link href="/app/goals?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              New Goal
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/5">
            <Link href="/app/assets?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              Wishlist
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm hover:border-cyan-500/50 hover:text-cyan-500 hover:bg-cyan-500/5">
            <Link href="/app/boards?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              New Board
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm hover:border-blue-500/50 hover:text-blue-500 hover:bg-blue-500/5">
            <Link href="/app/links?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              Add Link
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/5">
            <Link href="/app/files?upload=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              Upload
            </Link>
          </Button>
        </AnimatedQuickActions>
      </div>
    </div>
  )
}

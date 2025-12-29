import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
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
  Activity,
  TrendingUp,
  Zap,
  BarChart3,
  Brain,
  Rocket,
  ChevronRight,
} from 'lucide-react'
import { GitHubDashboard } from '@/components/hub/github-dashboard'
import { ProductivityAnalytics } from '@/components/hub/productivity-analytics'
import { ActivityFeed } from '@/components/hub/activity-feed'
import type { Goal } from '@/lib/actions/goals'
import type { Asset } from '@/lib/actions/assets'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  'active': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'development': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'coming-soon': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'past': 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
}

const statusLabels: Record<string, string> = {
  'active': 'Active',
  'development': 'In Dev',
  'coming-soon': 'Soon',
  'past': 'Past',
}

const priorityColors = {
  0: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
  1: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  2: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const priorityLabels = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
}

const projectIcons: Record<string, typeof Zap> = {
  'kachow': Zap,
  'stuntman': BarChart3,
  'brainbox': Brain,
  'arcene': Rocket,
  'cozyfilmz': Sparkles,
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
    { label: 'Notes', count: stats.notes, href: '/app/workspace', icon: FileText, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Boards', count: stats.boards, href: '/app/workspace', icon: Grid3X3, gradient: 'from-cyan-500 to-blue-600' },
    { label: 'Links', count: stats.links, href: '/app/links', icon: Link2, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Files', count: stats.files, href: '/app/files', icon: FolderOpen, gradient: 'from-emerald-500 to-green-600' },
  ]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Dashboard
          </h1>
          <p className="text-neutral-400 mt-1">
            Welcome back. Here's your overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400">All systems online</span>
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <div className="group relative overflow-hidden rounded-2xl bg-neutral-900/50 border border-white/5 p-5 hover:border-white/10 transition-all duration-300">
                {/* Gradient glow on hover */}
                <div className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                  `bg-gradient-to-br ${stat.gradient}`
                )} style={{ filter: 'blur(40px)', transform: 'scale(0.5)', opacity: 0 }} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      'p-2.5 rounded-xl bg-gradient-to-br',
                      stat.gradient
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-white">{stat.count}</p>
                    <p className="text-sm text-neutral-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Goals & Wishlist Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Goals */}
        <div className="rounded-2xl bg-neutral-900/50 border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Target className="w-4 h-4 text-violet-400" />
              </div>
              <span className="font-semibold text-white">Active Goals</span>
            </div>
            <Link
              href="/app/workspace"
              className="text-sm text-neutral-500 hover:text-violet-400 transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-5">
            {activeGoals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 mx-auto mb-4 flex items-center justify-center">
                  <Target className="w-6 h-6 text-violet-500/50" />
                </div>
                <p className="text-neutral-500 mb-4">No active goals yet</p>
                <Link
                  href="/app/workspace"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/10 text-violet-400 text-sm font-medium hover:bg-violet-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Goal
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-violet-500/10 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{goal.title}</p>
                      {goal.target_date && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(goal.target_date)}
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-md text-xs font-medium border',
                      priorityColors[goal.priority as 0 | 1 | 2]
                    )}>
                      {priorityLabels[goal.priority as 0 | 1 | 2]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wishlist */}
        <div className="rounded-2xl bg-neutral-900/50 border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-semibold text-white">Wishlist</span>
            </div>
            <Link
              href="/app/workspace"
              className="text-sm text-neutral-500 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-5">
            {wishlistItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 mx-auto mb-4 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-amber-500/50" />
                </div>
                <p className="text-neutral-500 mb-4">Wishlist is empty</p>
                <Link
                  href="/app/workspace"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {wishlistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-amber-500/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.external_link && (
                      <a
                        href={item.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-2xl bg-neutral-900/50 border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-semibold text-white">Activity Feed</span>
        </div>
        <div className="p-5">
          <ActivityFeed />
        </div>
      </div>

      {/* Productivity Analytics */}
      <div className="rounded-2xl bg-neutral-900/50 border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-white">Productivity</span>
        </div>
        <div className="p-5">
          <ProductivityAnalytics />
        </div>
      </div>

      {/* GitHub Activity */}
      <div className="rounded-2xl bg-neutral-900/50 border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            <Github className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">GitHub Activity</span>
        </div>
        <div className="p-5">
          <GitHubDashboard />
        </div>
      </div>

      {/* Ventures Grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Rocket className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-semibold text-white">Ventures</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROJECTS.map((project) => {
            const Icon = projectIcons[project.slug] || Zap
            return (
              <Link key={project.slug} href={`/app/projects/${project.slug}`}>
                <div className="group rounded-2xl bg-neutral-900/50 border border-white/5 p-5 hover:border-white/10 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500 group-hover:to-blue-600 transition-all">
                      <Icon className="w-5 h-5 text-cyan-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-md text-xs font-medium border',
                      statusColors[project.status]
                    )}>
                      {statusLabels[project.status]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-neutral-500 line-clamp-2">
                    {project.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-fuchsia-500/10">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
          </div>
          <span className="font-semibold text-white">Quick Actions</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'New Note', href: '/app/workspace', gradient: 'from-violet-500 to-purple-600' },
            { label: 'New Goal', href: '/app/workspace', gradient: 'from-emerald-500 to-green-600' },
            { label: 'Wishlist', href: '/app/workspace', gradient: 'from-amber-500 to-orange-600' },
            { label: 'New Board', href: '/app/workspace', gradient: 'from-fuchsia-500 to-pink-600' },
            { label: 'Add Link', href: '/app/links', gradient: 'from-blue-500 to-cyan-600' },
            { label: 'Upload', href: '/app/files', gradient: 'from-cyan-500 to-teal-600' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all',
                'bg-gradient-to-r hover:shadow-lg hover:scale-[1.02]',
                action.gradient
              )}
            >
              <Plus className="w-4 h-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

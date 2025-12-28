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
} from 'lucide-react'
import { GitHubDashboard } from '@/components/hub/github-dashboard'
import { ProductivityAnalytics } from '@/components/hub/productivity-analytics'
import { ActivityFeed } from '@/components/hub/activity-feed'
import { HackerDashboardClient } from '@/components/hub/hacker-dashboard-client'
import type { Goal } from '@/lib/actions/goals'
import type { Asset } from '@/lib/actions/assets'

const statusColors: Record<string, string> = {
  'active': 'bg-green-500/10 text-green-400 border-green-500/30',
  'development': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'coming-soon': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'past': 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
}

const statusLabels: Record<string, string> = {
  'active': 'ONLINE',
  'development': 'DEV',
  'coming-soon': 'PENDING',
  'past': 'OFFLINE',
}

const priorityColors = {
  0: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
  1: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  2: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const priorityLabels = {
  0: 'LOW',
  1: 'MED',
  2: 'HIGH',
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
    { label: 'Notes', count: stats.notes, href: '/app/workspace', icon: FileText, color: 'cyan' },
    { label: 'Boards', count: stats.boards, href: '/app/workspace', icon: Grid3X3, color: 'purple' },
    { label: 'Links', count: stats.links, href: '/app/links', icon: Link2, color: 'amber' },
    { label: 'Files', count: stats.files, href: '/app/files', icon: FolderOpen, color: 'green' },
  ]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <HackerDashboardClient>
      <div className="space-y-8">
        {/* Header with system info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold text-cyan-400 tracking-wider">
              SYSTEM DASHBOARD
            </h1>
            <p className="text-sm text-neutral-500 font-mono mt-1">
              [OPERATOR COMMAND CENTER]
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-green-500/30 bg-green-500/10">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            const colorClasses: Record<string, { text: string; border: string; bg: string; glow: string }> = {
              cyan: { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', glow: '0 0 30px rgba(0, 255, 255, 0.2)' },
              purple: { text: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10', glow: '0 0 30px rgba(191, 0, 255, 0.2)' },
              amber: { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', glow: '0 0 30px rgba(255, 191, 0, 0.2)' },
              green: { text: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10', glow: '0 0 30px rgba(0, 255, 65, 0.2)' },
            }
            const colors = colorClasses[stat.color]

            return (
              <Link key={stat.label} href={stat.href}>
                <div
                  className={`relative overflow-hidden rounded-lg p-4 sm:p-5 border ${colors.border} ${colors.bg} backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] group`}
                  style={{ boxShadow: colors.glow }}
                >
                  {/* Corner accents */}
                  <div className={`absolute top-0 left-0 w-3 h-px ${colors.text.replace('text-', 'bg-')}`} />
                  <div className={`absolute top-0 left-0 h-3 w-px ${colors.text.replace('text-', 'bg-')}`} />
                  <div className={`absolute bottom-0 right-0 w-3 h-px ${colors.text.replace('text-', 'bg-')}`} />
                  <div className={`absolute bottom-0 right-0 h-3 w-px ${colors.text.replace('text-', 'bg-')}`} />

                  {/* Scanline effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" style={{ height: '2px', animation: 'scanline 2s linear infinite' }} />
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                        {stat.label}
                      </span>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div className="flex items-end justify-between">
                      <span className={`text-3xl sm:text-4xl font-mono font-bold ${colors.text}`}>
                        {stat.count}
                      </span>
                      <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Real Data Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Notes', value: stats.notes.toString(), icon: FileText, color: 'fuchsia' },
            { label: 'Boards', value: stats.boards.toString(), icon: Grid3X3, color: 'green' },
            { label: 'Links', value: stats.links.toString(), icon: Link2, color: 'purple' },
            { label: 'Files', value: stats.files.toString(), icon: FolderOpen, color: 'amber' },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-fuchsia-500/20 bg-black/40"
            >
              <metric.icon className={`w-4 h-4 text-${metric.color}-400`} />
              <div>
                <p className="text-[10px] font-mono text-neutral-500 uppercase">{metric.label}</p>
                <p className={`text-sm font-mono font-bold text-${metric.color}-400`}>{metric.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Goals & Wishlist Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Goals */}
          <div className="rounded-lg border border-cyan-500/30 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-sm text-cyan-400 uppercase tracking-wider">Active Goals</span>
              </div>
              <Link
                href="/app/workspace"
                className="text-xs font-mono text-neutral-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                VIEW ALL <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4">
              {activeGoals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-10 h-10 text-cyan-500/30 mx-auto mb-3" />
                  <p className="text-sm font-mono text-neutral-500 mb-4">NO ACTIVE GOALS</p>
                  <Link
                    href="/app/workspace"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-mono hover:bg-cyan-500/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    ADD GOAL
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-start gap-3 p-3 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cyan-500/50 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-white truncate">{goal.title}</p>
                        {goal.target_date && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-500 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(goal.target_date)}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${priorityColors[goal.priority as 0 | 1 | 2]}`}>
                        {priorityLabels[goal.priority as 0 | 1 | 2]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Wishlist */}
          <div className="rounded-lg border border-amber-500/30 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-sm text-amber-400 uppercase tracking-wider">Wishlist</span>
              </div>
              <Link
                href="/app/workspace"
                className="text-xs font-mono text-neutral-500 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                VIEW ALL <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4">
              {wishlistItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-10 h-10 text-amber-500/30 mx-auto mb-3" />
                  <p className="text-sm font-mono text-neutral-500 mb-4">WISHLIST EMPTY</p>
                  <Link
                    href="/app/workspace"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-mono hover:bg-amber-500/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    ADD ITEM
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {wishlistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                    >
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded object-cover border border-amber-500/30"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-amber-500/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-white truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[10px] font-mono text-neutral-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.external_link && (
                        <a
                          href={item.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-500 hover:text-amber-400 transition-colors"
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
        <div className="rounded-lg border border-purple-500/30 bg-black/40 backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-500/20 flex items-center gap-3">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-sm text-purple-400 uppercase tracking-wider">Activity Feed</span>
          </div>
          <div className="p-4">
            <ActivityFeed />
          </div>
        </div>

        {/* Productivity Analytics */}
        <div className="rounded-lg border border-green-500/30 bg-black/40 backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-green-500/20 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="font-mono text-sm text-green-400 uppercase tracking-wider">Productivity Analytics</span>
          </div>
          <div className="p-4">
            <ProductivityAnalytics />
          </div>
        </div>

        {/* GitHub Activity */}
        <div className="rounded-lg border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
            <Github className="w-4 h-4 text-white" />
            <span className="font-mono text-sm text-white uppercase tracking-wider">GitHub Activity</span>
          </div>
          <div className="p-4">
            <GitHubDashboard />
          </div>
        </div>

        {/* Ventures Grid */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-sm text-cyan-400 uppercase tracking-wider">Ventures</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROJECTS.map((project) => {
              const Icon = projectIcons[project.slug] || Zap
              return (
                <Link key={project.slug} href={`/app/projects/${project.slug}`}>
                  <div className="group rounded-lg border border-white/10 bg-black/40 backdrop-blur-xl p-4 hover:border-cyan-500/30 transition-all duration-300">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-3 h-px bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-0 left-0 h-3 w-px bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                      </span>
                    </div>
                    <h3 className="font-mono text-sm font-bold text-white group-hover:text-cyan-400 transition-colors mb-1">
                      {project.name}
                    </h3>
                    <p className="text-[11px] font-mono text-neutral-500 line-clamp-2">
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
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-sm text-purple-400 uppercase tracking-wider">Quick Actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'NEW NOTE', href: '/app/workspace', color: 'cyan' },
              { label: 'NEW GOAL', href: '/app/workspace', color: 'green' },
              { label: 'WISHLIST', href: '/app/workspace', color: 'amber' },
              { label: 'NEW BOARD', href: '/app/workspace', color: 'purple' },
              { label: 'ADD LINK', href: '/app/links', color: 'blue' },
              { label: 'UPLOAD', href: '/app/files', color: 'emerald' },
            ].map((action) => {
              const colorClasses: Record<string, string> = {
                cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20',
                green: 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20',
                amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
                purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
                blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
                emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
              }

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded border text-xs font-mono transition-colors ${colorClasses[action.color]}`}
                >
                  <Plus className="w-3 h-3" />
                  {action.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </HackerDashboardClient>
  )
}

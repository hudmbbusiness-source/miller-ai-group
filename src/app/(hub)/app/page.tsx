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
} from 'lucide-react'
import { GitHubDashboard } from '@/components/hub/github-dashboard'
import { ProductivityAnalytics } from '@/components/hub/productivity-analytics'
import { ActivityFeed } from '@/components/hub/activity-feed'
import type { Goal } from '@/lib/actions/goals'
import type { Asset } from '@/lib/actions/assets'

const statusColors: Record<string, string> = {
  'active': 'bg-green-500/10 text-green-500 border-green-500/20',
  'development': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'coming-soon': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'past': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const statusLabels: Record<string, string> = {
  'active': 'Active',
  'development': 'In Development',
  'coming-soon': 'Coming Soon',
  'past': 'Past Venture',
}

const priorityColors = {
  0: 'bg-gray-500/10 text-gray-500',
  1: 'bg-blue-500/10 text-blue-500',
  2: 'bg-red-500/10 text-red-500',
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
    { label: 'Notes', count: stats.notes, icon: FileText, href: '/app/notes' },
    { label: 'Boards', count: stats.boards, icon: Grid3X3, href: '/app/boards' },
    { label: 'Links', count: stats.links, icon: Link2, href: '/app/links' },
    { label: 'Files', count: stats.files, icon: FolderOpen, href: '/app/files' },
  ]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Welcome back to your personal hub.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-amber-500/50 transition-colors cursor-pointer h-full group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-amber-500 transition-colors">
                  {stat.label}
                </CardTitle>
                <stat.icon className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stat.count}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Goals & Wishlist Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Goals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                <CardTitle>Active Goals</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
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
                <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No active goals yet</p>
                <Button asChild size="sm">
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
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
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
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/app/goals?new=true">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Goal
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wishlist */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <CardTitle>Wishlist</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
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
                <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Nothing on wishlist yet</p>
                <Button asChild size="sm">
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
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
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
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/app/assets?new=true">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <ActivityFeed />

      {/* Productivity Analytics */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Productivity Analytics</h2>
        <ProductivityAnalytics />
      </div>

      {/* GitHub Section */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Github className="w-5 h-5" />
          GitHub Activity
        </h2>
        <GitHubDashboard />
      </div>

      {/* Projects Section */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Ventures</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PROJECTS.map((project) => (
            <Card key={project.slug}>
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
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/projects/${project.slug}`}>
                    Open Project Page
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
          <Button asChild className="h-10 sm:h-9 text-sm">
            <Link href="/app/notes?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              New Note
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm">
            <Link href="/app/goals?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              New Goal
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm">
            <Link href="/app/assets?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              Wishlist
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm">
            <Link href="/app/boards?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              New Board
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm">
            <Link href="/app/links?new=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              Add Link
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 sm:h-9 text-sm">
            <Link href="/app/files?upload=true">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              Upload
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

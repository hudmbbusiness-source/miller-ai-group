'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Target,
  Link2,
  Image,
  FolderOpen,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Activity,
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'note' | 'goal' | 'link' | 'file' | 'board' | 'accomplishment'
  action: 'created' | 'updated' | 'completed' | 'deleted'
  title: string
  timestamp: string
  metadata?: Record<string, string>
}

const typeIcons = {
  note: FileText,
  goal: Target,
  link: Link2,
  file: FolderOpen,
  board: Image,
  accomplishment: CheckCircle2,
}

const typeColors = {
  note: 'text-blue-500',
  goal: 'text-amber-500',
  link: 'text-green-500',
  file: 'text-purple-500',
  board: 'text-pink-500',
  accomplishment: 'text-orange-500',
}

const actionBadges = {
  created: { label: 'Created', variant: 'default' as const },
  updated: { label: 'Updated', variant: 'secondary' as const },
  completed: { label: 'Completed', variant: 'default' as const },
  deleted: { label: 'Deleted', variant: 'destructive' as const },
}

function formatTimeAgo(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const allActivities: ActivityItem[] = []

      // Define types for database rows
      interface NoteRow { id: string; title: string | null; created_at: string; updated_at: string | null }
      interface GoalRow { id: string; title: string; status: string; created_at: string; updated_at: string | null }
      interface LinkRow { id: string; title: string | null; created_at: string }
      interface FileRow { id: string; filename: string; created_at: string }
      interface BoardRow { id: string; name: string; created_at: string }

      // Fetch recent notes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: notes } = await (supabase as any)
        .from('notes')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (notes) {
        (notes as NoteRow[]).forEach(note => {
          allActivities.push({
            id: `note-${note.id}`,
            type: 'note',
            action: 'created',
            title: note.title || 'Untitled Note',
            timestamp: note.updated_at || note.created_at,
          })
        })
      }

      // Fetch recent goals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: goals } = await (supabase as any)
        .from('goals')
        .select('id, title, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (goals) {
        (goals as GoalRow[]).forEach(goal => {
          allActivities.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            action: goal.status === 'completed' ? 'completed' : 'created',
            title: goal.title,
            timestamp: goal.updated_at || goal.created_at,
          })
        })
      }

      // Fetch recent links
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: links } = await (supabase as any)
        .from('saved_links')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (links) {
        (links as LinkRow[]).forEach(link => {
          allActivities.push({
            id: `link-${link.id}`,
            type: 'link',
            action: 'created',
            title: link.title || 'Untitled Link',
            timestamp: link.created_at,
          })
        })
      }

      // Fetch recent files
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: files } = await (supabase as any)
        .from('files_index')
        .select('id, filename, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (files) {
        (files as FileRow[]).forEach(file => {
          allActivities.push({
            id: `file-${file.id}`,
            type: 'file',
            action: 'created',
            title: file.filename,
            timestamp: file.created_at,
          })
        })
      }

      // Fetch recent boards
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: boards } = await (supabase as any)
        .from('boards')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (boards) {
        (boards as BoardRow[]).forEach(board => {
          allActivities.push({
            id: `board-${board.id}`,
            type: 'board',
            action: 'created',
            title: board.name,
            timestamp: board.created_at,
          })
        })
      }

      // Sort all activities by timestamp
      allActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Take the 15 most recent
      setActivities(allActivities.slice(0, 15))
    } catch (err) {
      console.error('Failed to fetch activity:', err)
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchActivity}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground text-sm">No recent activity</p>
          <p className="text-muted-foreground text-xs mt-1">
            Start creating notes, goals, or links to see activity here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchActivity} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
        {activities.map((activity) => {
          const Icon = typeIcons[activity.type]
          const colorClass = typeColors[activity.type]
          const badge = actionBadges[activity.action]

          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                    {badge.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

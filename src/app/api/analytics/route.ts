import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get productivity analytics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Fetch all data in parallel
    const [
      notesThisWeek,
      notesThisMonth,
      notesLastMonth,
      totalNotes,
      goalsCompleted,
      goalsActive,
      linksThisWeek,
      linksThisMonth,
      totalLinks,
      filesUploaded,
      boardsCreated,
    ] = await Promise.all([
      // Notes this week
      supabase
        .from('notes')
        .select('id, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString()),

      // Notes this month
      supabase
        .from('notes')
        .select('id, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', monthAgo.toISOString()),

      // Notes last month (for comparison)
      supabase
        .from('notes')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', twoMonthsAgo.toISOString())
        .lt('created_at', monthAgo.toISOString()),

      // Total notes
      supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Goals completed (using raw query with any type)
      (supabase.from('goals') as ReturnType<typeof supabase.from>)
        .select('id, completed_at', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'completed'),

      // Active goals
      (supabase.from('goals') as ReturnType<typeof supabase.from>)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),

      // Links saved this week
      supabase
        .from('saved_links')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString()),

      // Links saved this month
      supabase
        .from('saved_links')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthAgo.toISOString()),

      // Total links
      supabase
        .from('saved_links')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Files uploaded this month
      supabase
        .from('files_index')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthAgo.toISOString()),

      // Boards created
      supabase
        .from('boards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    // Calculate activity by day of week for notes this month
    const notesByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    if (notesThisMonth.data) {
      (notesThisMonth.data as Array<{ id: string; created_at: string }>).forEach((note) => {
        const day = new Date(note.created_at).getDay()
        notesByDay[day]++
      })
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const activityByDay = Object.entries(notesByDay).map(([day, count]) => ({
      day: dayNames[parseInt(day)],
      count,
    }))

    // Calculate weekly activity trend (last 4 weeks)
    const weeklyTrend = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)

      let count = 0
      if (notesThisMonth.data) {
        count = (notesThisMonth.data as Array<{ id: string; created_at: string }>).filter((note) => {
          const noteDate = new Date(note.created_at)
          return noteDate >= weekStart && noteDate < weekEnd
        }).length
      }

      weeklyTrend.push({
        week: `Week ${4 - i}`,
        notes: count,
      })
    }

    // Calculate month-over-month change
    const thisMonthCount = notesThisMonth.count || 0
    const lastMonthCount = notesLastMonth.count || 0
    const monthlyChange = lastMonthCount === 0
      ? thisMonthCount > 0 ? 100 : 0
      : Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)

    // Productivity score (simple calculation based on activity)
    const productivityScore = Math.min(100, Math.round(
      ((notesThisWeek.count || 0) * 10) +
      ((linksThisWeek.count || 0) * 5) +
      ((goalsCompleted.count || 0) * 20)
    ))

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalNotes: totalNotes.count || 0,
          totalLinks: totalLinks.count || 0,
          totalBoards: boardsCreated.count || 0,
          activeGoals: goalsActive.count || 0,
          completedGoals: goalsCompleted.count || 0,
        },
        thisWeek: {
          notes: notesThisWeek.count || 0,
          links: linksThisWeek.count || 0,
        },
        thisMonth: {
          notes: thisMonthCount,
          links: linksThisMonth.count || 0,
          files: filesUploaded.count || 0,
          monthlyChange,
        },
        activityByDay,
        weeklyTrend,
        productivityScore,
      },
    })
  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({
      success: true,
      analytics: {
        overview: { totalNotes: 0, totalLinks: 0, totalBoards: 0, activeGoals: 0, completedGoals: 0 },
        thisWeek: { notes: 0, links: 0 },
        thisMonth: { notes: 0, links: 0, files: 0, monthlyChange: 0 },
        activityByDay: [],
        weeklyTrend: [],
        productivityScore: 0,
      },
    })
  }
}

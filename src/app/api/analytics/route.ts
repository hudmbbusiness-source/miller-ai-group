import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get productivity analytics for the authenticated user
export async function GET(_request: NextRequest) {
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
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Fetch all data in parallel
    const [
      notesThisWeek,
      notesLast90Days,
      notesLastMonth,
      totalNotes,
      goalsCompleted,
      goalsActive,
      allGoals,
      linksThisWeek,
      linksLast90Days,
      totalLinks,
      filesUploaded,
      boardsCreated,
      totalFiles,
    ] = await Promise.all([
      // Notes this week
      supabase
        .from('notes')
        .select('id, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString()),

      // Notes last 90 days (for charts)
      supabase
        .from('notes')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', threeMonthsAgo.toISOString())
        .order('created_at', { ascending: true }),

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

      // Goals completed
      (supabase.from('goals') as ReturnType<typeof supabase.from>)
        .select('id, completed_at', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'completed'),

      // Active goals
      (supabase.from('goals') as ReturnType<typeof supabase.from>)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),

      // All goals with dates for chart
      (supabase.from('goals') as ReturnType<typeof supabase.from>)
        .select('id, created_at, completed_at, status')
        .eq('user_id', user.id)
        .gte('created_at', threeMonthsAgo.toISOString()),

      // Links saved this week
      supabase
        .from('saved_links')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString()),

      // Links last 90 days (for charts)
      supabase
        .from('saved_links')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', threeMonthsAgo.toISOString())
        .order('created_at', { ascending: true }),

      // Total links
      supabase
        .from('saved_links')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Files uploaded this month
      supabase
        .from('files_index')
        .select('id, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', monthAgo.toISOString()),

      // Boards created
      supabase
        .from('boards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Total files
      supabase
        .from('files_index')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    // Calculate activity by day of week for notes (last 30 days)
    const notesThisMonth = (notesLast90Days.data || []).filter((n: { created_at: string }) =>
      new Date(n.created_at) >= monthAgo
    )
    const notesByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    notesThisMonth.forEach((note: { created_at: string }) => {
      const day = new Date(note.created_at).getDay()
      notesByDay[day]++
    })

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const activityByDay = Object.entries(notesByDay).map(([day, count]) => ({
      day: dayNames[parseInt(day)],
      count,
    }))

    // Generate daily activity for last 30 days (for area chart)
    const dailyActivity: Array<{ date: string; notes: number; links: number }> = []
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const notesCount = (notesLast90Days.data || []).filter((n: { created_at: string }) => {
        const d = new Date(n.created_at)
        return d >= dayStart && d < dayEnd
      }).length

      const linksCount = (linksLast90Days.data || []).filter((l: { created_at: string }) => {
        const d = new Date(l.created_at)
        return d >= dayStart && d < dayEnd
      }).length

      dailyActivity.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        notes: notesCount,
        links: linksCount,
      })
    }

    // Generate weekly trend (last 12 weeks)
    const weeklyTrend: Array<{ week: string; notes: number; links: number; goals: number }> = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)

      const notesCount = (notesLast90Days.data || []).filter((n: { created_at: string }) => {
        const d = new Date(n.created_at)
        return d >= weekStart && d < weekEnd
      }).length

      const linksCount = (linksLast90Days.data || []).filter((l: { created_at: string }) => {
        const d = new Date(l.created_at)
        return d >= weekStart && d < weekEnd
      }).length

      const goalsCount = (allGoals.data || []).filter((g: { created_at: string }) => {
        const d = new Date(g.created_at)
        return d >= weekStart && d < weekEnd
      }).length

      weeklyTrend.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        notes: notesCount,
        links: linksCount,
        goals: goalsCount,
      })
    }

    // Calculate month-over-month change
    const thisMonthCount = notesThisMonth.length
    const lastMonthNotes = (notesLast90Days.data || []).filter((n: { created_at: string }) => {
      const d = new Date(n.created_at)
      return d >= twoMonthsAgo && d < monthAgo
    })
    const lastMonthCount = lastMonthNotes.length
    const monthlyChange = lastMonthCount === 0
      ? thisMonthCount > 0 ? 100 : 0
      : Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)

    // Links this month
    const linksThisMonthCount = (linksLast90Days.data || []).filter((l: { created_at: string }) =>
      new Date(l.created_at) >= monthAgo
    ).length

    // Calculate streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    for (let i = 0; i < 30; i++) {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const hadActivity = (notesLast90Days.data || []).some((n: { created_at: string }) => {
        const d = new Date(n.created_at)
        return d >= dayStart && d < dayEnd
      }) || (linksLast90Days.data || []).some((l: { created_at: string }) => {
        const d = new Date(l.created_at)
        return d >= dayStart && d < dayEnd
      })

      if (hadActivity) {
        tempStreak++
        if (i === 0) currentStreak = tempStreak
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak
        tempStreak = 0
        if (i === 0) currentStreak = 0
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak
    // Continue current streak count
    for (let i = 1; i <= 30 && currentStreak > 0; i++) {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const hadActivity = (notesLast90Days.data || []).some((n: { created_at: string }) => {
        const d = new Date(n.created_at)
        return d >= dayStart && d < dayEnd
      }) || (linksLast90Days.data || []).some((l: { created_at: string }) => {
        const d = new Date(l.created_at)
        return d >= dayStart && d < dayEnd
      })

      if (hadActivity) {
        currentStreak++
      } else {
        break
      }
    }

    // Productivity score (based on activity)
    const productivityScore = Math.min(100, Math.round(
      ((notesThisWeek.count || 0) * 10) +
      ((linksThisWeek.count || 0) * 5) +
      ((goalsCompleted.count || 0) * 20) +
      (currentStreak * 5)
    ))

    // Category breakdown for pie chart
    const categoryBreakdown = [
      { name: 'Notes', value: totalNotes.count || 0, color: '#3b82f6' },
      { name: 'Links', value: totalLinks.count || 0, color: '#8b5cf6' },
      { name: 'Files', value: totalFiles.count || 0, color: '#10b981' },
      { name: 'Boards', value: boardsCreated.count || 0, color: '#f59e0b' },
      { name: 'Goals', value: (goalsActive.count || 0) + (goalsCompleted.count || 0), color: '#ef4444' },
    ].filter(c => c.value > 0)

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalNotes: totalNotes.count || 0,
          totalLinks: totalLinks.count || 0,
          totalBoards: boardsCreated.count || 0,
          totalFiles: totalFiles.count || 0,
          activeGoals: goalsActive.count || 0,
          completedGoals: goalsCompleted.count || 0,
        },
        thisWeek: {
          notes: notesThisWeek.count || 0,
          links: linksThisWeek.count || 0,
        },
        thisMonth: {
          notes: thisMonthCount,
          links: linksThisMonthCount,
          files: filesUploaded.count || 0,
          monthlyChange,
        },
        streaks: {
          current: currentStreak,
          longest: longestStreak,
        },
        activityByDay,
        dailyActivity,
        weeklyTrend,
        categoryBreakdown,
        productivityScore,
      },
    })
  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({
      success: true,
      analytics: {
        overview: { totalNotes: 0, totalLinks: 0, totalBoards: 0, totalFiles: 0, activeGoals: 0, completedGoals: 0 },
        thisWeek: { notes: 0, links: 0 },
        thisMonth: { notes: 0, links: 0, files: 0, monthlyChange: 0 },
        streaks: { current: 0, longest: 0 },
        activityByDay: [],
        dailyActivity: [],
        weeklyTrend: [],
        categoryBreakdown: [],
        productivityScore: 0,
      },
    })
  }
}

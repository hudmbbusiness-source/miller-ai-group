import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let username = searchParams.get('username')

  // Try to get the user's GitHub OAuth token from their session or user metadata
  let githubToken: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // First try session provider_token (available immediately after OAuth)
      const { data: { session } } = await supabase.auth.getSession()
      githubToken = session?.provider_token || null

      // Fall back to stored token in user metadata (persisted from OAuth callback)
      if (!githubToken && user.user_metadata?.github_access_token) {
        githubToken = user.user_metadata.github_access_token
      }

      // If no username provided, get it from the user's GitHub metadata
      if (!username && user.user_metadata) {
        username = user.user_metadata.user_name ||
                   user.user_metadata.preferred_username ||
                   user.user_metadata.login
      }
    }
  } catch (err) {
    console.error('Failed to get session:', err)
  }

  // Fallback to env token if no OAuth token, then to default username
  const token = githubToken || process.env.GITHUB_TOKEN || null
  username = username || 'hudsonmp'

  try {
    // Fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Miller-AI-Group',
        ...(token && {
          'Authorization': `Bearer ${token}`
        })
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!userRes.ok) {
      throw new Error(`Failed to fetch user: ${userRes.status}`)
    }

    const user = await userRes.json()

    // Fetch repositories (including private if token has access)
    const reposRes = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=10&visibility=all`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Miller-AI-Group',
          ...(token && {
            'Authorization': `Bearer ${token}`
          })
        },
        next: { revalidate: 3600 }
      }
    ).catch(() =>
      // Fallback to public repos if authenticated endpoint fails
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Miller-AI-Group',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        next: { revalidate: 3600 }
      })
    )

    if (!reposRes.ok) {
      throw new Error(`Failed to fetch repos: ${reposRes.status}`)
    }

    const repos = await reposRes.json()

    // Fetch contribution data using GraphQL API (if token available)
    let contributions = {
      total: 0,
      lastWeek: 0,
      commits: 0,
      pullRequests: 0,
      issues: 0,
      reviews: 0,
      calendar: [] as Array<{ date: string; count: number; level: number }>,
      streak: { current: 0, longest: 0 }
    }

    if (token) {
      try {
        const graphqlRes = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query($username: String!) {
                user(login: $username) {
                  contributionsCollection {
                    totalCommitContributions
                    totalPullRequestContributions
                    totalIssueContributions
                    totalPullRequestReviewContributions
                    contributionCalendar {
                      totalContributions
                      weeks {
                        contributionDays {
                          contributionCount
                          date
                          weekday
                          color
                        }
                      }
                    }
                  }
                  pullRequests(first: 100, states: [OPEN, MERGED]) {
                    totalCount
                  }
                  issues(first: 100, states: [OPEN, CLOSED]) {
                    totalCount
                  }
                }
              }
            `,
            variables: { username }
          }),
          next: { revalidate: 1800 }
        })

        if (graphqlRes.ok) {
          const graphqlData = await graphqlRes.json()
          const userData = graphqlData.data?.user
          const collection = userData?.contributionsCollection

          if (collection) {
            contributions.total = collection.contributionCalendar?.totalContributions || 0
            contributions.commits = collection.totalCommitContributions || 0
            contributions.pullRequests = collection.totalPullRequestContributions || 0
            contributions.issues = collection.totalIssueContributions || 0
            contributions.reviews = collection.totalPullRequestReviewContributions || 0

            // Calculate last week's contributions and build calendar data
            const weeks = collection.contributionCalendar?.weeks || []
            const lastWeek = weeks[weeks.length - 1]
            if (lastWeek) {
              contributions.lastWeek = lastWeek.contributionDays.reduce(
                (sum: number, day: { contributionCount: number }) => sum + day.contributionCount,
                0
              )
            }

            // Build calendar data for last 12 weeks (3 months)
            const recentWeeks = weeks.slice(-12)
            recentWeeks.forEach((week: { contributionDays: Array<{ date: string; contributionCount: number; color: string }> }) => {
              week.contributionDays.forEach((day) => {
                // Map GitHub's color to a level (0-4)
                const colorToLevel: Record<string, number> = {
                  '#ebedf0': 0, '#9be9a8': 1, '#40c463': 2, '#30a14e': 3, '#216e39': 4,
                  'var(--color-calendar-graph-day-bg)': 0,
                  'var(--color-calendar-graph-day-L1-bg)': 1,
                  'var(--color-calendar-graph-day-L2-bg)': 2,
                  'var(--color-calendar-graph-day-L3-bg)': 3,
                  'var(--color-calendar-graph-day-L4-bg)': 4,
                }
                contributions.calendar.push({
                  date: day.date,
                  count: day.contributionCount,
                  level: colorToLevel[day.color] ?? (day.contributionCount > 0 ? Math.min(Math.ceil(day.contributionCount / 3), 4) : 0)
                })
              })
            })

            // Calculate contribution streaks
            const allDays = weeks.flatMap((w: { contributionDays: Array<{ contributionCount: number }> }) => w.contributionDays)
            let currentStreak = 0
            let longestStreak = 0
            let tempStreak = 0

            // Work backwards from today to find current streak
            for (let i = allDays.length - 1; i >= 0; i--) {
              if (allDays[i].contributionCount > 0) {
                currentStreak++
              } else {
                break
              }
            }

            // Find longest streak
            for (const day of allDays) {
              if (day.contributionCount > 0) {
                tempStreak++
                longestStreak = Math.max(longestStreak, tempStreak)
              } else {
                tempStreak = 0
              }
            }

            contributions.streak = { current: currentStreak, longest: longestStreak }
          }
        }
      } catch (graphqlError) {
        console.error('GraphQL Error:', graphqlError)
      }
    }

    // Fallback to Events API if GraphQL didn't work
    if (contributions.total === 0) {
      const eventsRes = await fetch(
        `https://api.github.com/users/${username}/events?per_page=100`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Miller-AI-Group',
            ...(token && {
              'Authorization': `Bearer ${token}`
            })
          },
          next: { revalidate: 1800 }
        }
      )

      if (eventsRes.ok) {
        const events = await eventsRes.json()
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const pushEvents = events.filter((e: { type: string }) => e.type === 'PushEvent')
        contributions.total = pushEvents.length
        contributions.lastWeek = pushEvents.filter((e: { created_at: string }) =>
          new Date(e.created_at) > oneWeekAgo
        ).length
      }
    }

    // Transform repo data
    const transformedRepos = repos.map((repo: {
      name: string
      description: string | null
      html_url: string
      stargazers_count: number
      forks_count: number
      language: string | null
      updated_at: string
      pushed_at: string
      topics: string[]
      size: number
      private: boolean
      fork: boolean
    }) => ({
      name: repo.name,
      description: repo.description,
      html_url: repo.html_url,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      language: repo.language,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      topics: repo.topics || [],
      size: repo.size || 0,
      isPrivate: repo.private || false,
      isFork: repo.fork || false,
    }))

    // Calculate language distribution
    const languageCounts: Record<string, number> = {}
    const languageSizes: Record<string, number> = {}
    repos.forEach((repo: { language: string | null; size: number }) => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1
        languageSizes[repo.language] = (languageSizes[repo.language] || 0) + (repo.size || 0)
      }
    })

    // Sort languages by repo count and calculate percentages
    const totalReposWithLang = Object.values(languageCounts).reduce((a, b) => a + b, 0)
    const totalSize = Object.values(languageSizes).reduce((a, b) => a + b, 0)
    const languageDistribution = Object.entries(languageCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalReposWithLang > 0 ? Math.round((count / totalReposWithLang) * 100) : 0,
        sizePercentage: totalSize > 0 ? Math.round((languageSizes[name] / totalSize) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8) // Top 8 languages

    // Count private repos if we have access
    const privateRepoCount = repos.filter((r: { private: boolean }) => r.private).length

    // Categorize repos by activity
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const repoActivity = {
      activeThisWeek: repos.filter((r: { pushed_at: string }) => new Date(r.pushed_at) > oneWeekAgo).length,
      activeThisMonth: repos.filter((r: { pushed_at: string }) => new Date(r.pushed_at) > oneMonthAgo).length,
      total: repos.length,
      forked: repos.filter((r: { fork: boolean }) => r.fork).length,
      original: repos.filter((r: { fork: boolean }) => !r.fork).length,
    }

    // Calculate total stats across all repos
    const repoStats = {
      totalStars: repos.reduce((acc: number, r: { stargazers_count: number }) => acc + r.stargazers_count, 0),
      totalForks: repos.reduce((acc: number, r: { forks_count: number }) => acc + r.forks_count, 0),
      totalSize: totalSize,
      avgSize: repos.length > 0 ? Math.round(totalSize / repos.length) : 0,
    }

    return NextResponse.json({
      user: {
        login: user.login,
        name: user.name || user.login,
        avatar_url: user.avatar_url,
        bio: user.bio,
        public_repos: user.public_repos,
        private_repos: user.total_private_repos || privateRepoCount,
        total_repos: user.public_repos + (user.total_private_repos || 0),
        followers: user.followers,
        following: user.following,
        created_at: user.created_at,
        company: user.company,
        location: user.location,
        blog: user.blog,
        twitter_username: user.twitter_username,
      },
      repos: transformedRepos,
      contributions,
      languageDistribution,
      repoActivity,
      repoStats,
      auth: {
        authenticated: !!githubToken,
        hasPrivateAccess: privateRepoCount > 0 || !!user.total_private_repos,
        tokenSource: githubToken ? 'oauth' : (process.env.GITHUB_TOKEN ? 'env' : 'none'),
      },
    })
  } catch (error) {
    console.error('GitHub API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub stats' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface UserPreferences {
  // Career & Professional
  careerGoal: string
  targetRole: string
  skills: string[]
  interests: string[]
  currentYear: string // freshman, sophomore, junior, senior, graduate

  // Display & UI
  theme: 'light' | 'dark' | 'system'
  dashboardLayout: 'default' | 'compact' | 'expanded'

  // Notifications
  emailNotifications: boolean
  weeklyDigest: boolean
  goalReminders: boolean

  // Privacy
  publicProfile: boolean
  showGitHub: boolean

  // Metadata
  lastUpdated: string
}

const DEFAULT_PREFERENCES: UserPreferences = {
  careerGoal: '',
  targetRole: '',
  skills: [],
  interests: [],
  currentYear: 'junior',
  theme: 'dark',
  dashboardLayout: 'default',
  emailNotifications: true,
  weeklyDigest: true,
  goalReminders: true,
  publicProfile: true,
  showGitHub: true,
  lastUpdated: new Date().toISOString(),
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch preferences from site_content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('site_content') as any)
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'user_preferences')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error)
    }

    // Merge with defaults to ensure all fields exist
    const preferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(data?.value || {}),
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Preferences API Error:', error)
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const preferences: Partial<UserPreferences> = body.preferences

    // Validate and sanitize
    const sanitizedPreferences: UserPreferences = {
      careerGoal: String(preferences.careerGoal || '').slice(0, 500),
      targetRole: String(preferences.targetRole || '').slice(0, 200),
      skills: Array.isArray(preferences.skills)
        ? preferences.skills.slice(0, 20).map(s => String(s).slice(0, 50))
        : [],
      interests: Array.isArray(preferences.interests)
        ? preferences.interests.slice(0, 20).map(i => String(i).slice(0, 50))
        : [],
      currentYear: ['freshman', 'sophomore', 'junior', 'senior', 'graduate', 'professional'].includes(preferences.currentYear || '')
        ? preferences.currentYear as UserPreferences['currentYear']
        : 'junior',
      theme: ['light', 'dark', 'system'].includes(preferences.theme || '')
        ? preferences.theme as UserPreferences['theme']
        : 'dark',
      dashboardLayout: ['default', 'compact', 'expanded'].includes(preferences.dashboardLayout || '')
        ? preferences.dashboardLayout as UserPreferences['dashboardLayout']
        : 'default',
      emailNotifications: Boolean(preferences.emailNotifications),
      weeklyDigest: Boolean(preferences.weeklyDigest),
      goalReminders: Boolean(preferences.goalReminders),
      publicProfile: Boolean(preferences.publicProfile),
      showGitHub: Boolean(preferences.showGitHub),
      lastUpdated: new Date().toISOString(),
    }

    // Save to site_content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('site_content') as any)
      .upsert({
        key: 'user_preferences',
        value: sanitizedPreferences,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key,user_id' })

    if (error) {
      console.error('Error saving preferences:', error)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: sanitizedPreferences })
  } catch (error) {
    console.error('Preferences API Error:', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}

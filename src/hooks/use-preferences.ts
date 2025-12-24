'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserPreferences } from '@/app/api/preferences/route'

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

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/preferences')
      if (!response.ok) throw new Error('Failed to fetch preferences')

      const data = await response.json()
      setPreferences(data.preferences)
    } catch (err) {
      console.error('Failed to fetch preferences:', err)
      setError('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }, [])

  const savePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    setSaving(true)
    setError(null)

    try {
      const merged = { ...preferences, ...newPreferences }
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: merged }),
      })

      if (!response.ok) throw new Error('Failed to save preferences')

      const data = await response.json()
      setPreferences(data.preferences)
      return true
    } catch (err) {
      console.error('Failed to save preferences:', err)
      setError('Failed to save preferences')
      return false
    } finally {
      setSaving(false)
    }
  }, [preferences])

  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    return savePreferences({ [key]: value })
  }, [savePreferences])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  // Apply theme preference
  useEffect(() => {
    if (!loading) {
      const root = document.documentElement
      const theme = preferences.theme

      if (theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', systemDark)
      } else {
        root.classList.toggle('dark', theme === 'dark')
      }
    }
  }, [preferences.theme, loading])

  return {
    preferences,
    loading,
    saving,
    error,
    fetchPreferences,
    savePreferences,
    updatePreference,
  }
}

// Export type for use in other components
export type { UserPreferences }

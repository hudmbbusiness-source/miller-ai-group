'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface Shortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
  category: 'navigation' | 'actions' | 'editing' | 'system'
}

const defaultShortcuts: Omit<Shortcut, 'action'>[] = [
  // Navigation
  { key: 'g', description: 'Go to Launch Pad', category: 'navigation', shift: true },
  { key: 'n', description: 'Go to Notes', category: 'navigation', shift: true },
  { key: 'b', description: 'Go to Boards', category: 'navigation', shift: true },
  { key: 'l', description: 'Go to Links', category: 'navigation', shift: true },
  { key: 'f', description: 'Go to Files', category: 'navigation', shift: true },
  { key: 't', description: 'Go to Goals', category: 'navigation', shift: true },
  { key: 's', description: 'Go to Settings', category: 'navigation', shift: true },
  { key: 'd', description: 'Go to Dashboard', category: 'navigation', shift: true },

  // Actions
  { key: 'k', ctrl: true, description: 'Open Search', category: 'actions' },
  { key: 'k', meta: true, description: 'Open Search', category: 'actions' },
  { key: '/', description: 'Open Help', category: 'actions' },

  // System
  { key: 'Escape', description: 'Close modal/dialog', category: 'system' },
]

// Navigation routes - defined outside to avoid recreation
const NAVIGATION_ROUTES: Record<string, string> = {
  'Shift+g': '/app/launch-pad',
  'Shift+n': '/app/notes',
  'Shift+b': '/app/boards',
  'Shift+l': '/app/links',
  'Shift+f': '/app/files',
  'Shift+t': '/app/goals',
  'Shift+s': '/app/settings',
  'Shift+d': '/app',
}

export function useKeyboardShortcuts(
  customShortcuts: Shortcut[] = [],
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const router = useRouter()
  const lastKeyTime = useRef<number>(0)
  const lastKey = useRef<string>('')

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape in inputs
      if (event.key !== 'Escape') return
    }

    // Build shortcut key string
    const parts: string[] = []
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.metaKey) parts.push('Meta')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')
    parts.push(event.key)
    const shortcutKey = parts.join('+')

    // Check navigation shortcuts
    const route = NAVIGATION_ROUTES[shortcutKey]
    if (route) {
      event.preventDefault()
      router.push(route)
      return
    }

    // Check custom shortcuts
    for (const shortcut of customShortcuts) {
      const matchCtrl = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey
      const matchMeta = shortcut.meta ? event.metaKey : !event.metaKey
      const matchShift = shortcut.shift ? event.shiftKey : !event.shiftKey
      const matchAlt = shortcut.alt ? event.altKey : !event.altKey
      const matchKey = event.key.toLowerCase() === shortcut.key.toLowerCase()

      if (matchKey && matchCtrl && matchMeta && matchShift && matchAlt) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }

    // Double-tap detection (e.g., 'gg' for go to top)
    const now = Date.now()
    if (now - lastKeyTime.current < 300 && lastKey.current === event.key) {
      if (event.key === 'g' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    lastKeyTime.current = now
    lastKey.current = event.key
  }, [enabled, customShortcuts, router])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { shortcuts: defaultShortcuts }
}

// Helper to format shortcut for display
export function formatShortcut(shortcut: Omit<Shortcut, 'action'>): string {
  const parts: string[] = []

  // Use platform-specific modifiers
  const isMac = typeof window !== 'undefined' && navigator.platform.includes('Mac')

  if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl')
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Ctrl')
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt')
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift')

  // Format special keys
  const keyDisplay = shortcut.key === 'Escape' ? 'Esc' :
                     shortcut.key === 'Enter' ? '↵' :
                     shortcut.key === 'ArrowUp' ? '↑' :
                     shortcut.key === 'ArrowDown' ? '↓' :
                     shortcut.key === 'ArrowLeft' ? '←' :
                     shortcut.key === 'ArrowRight' ? '→' :
                     shortcut.key.toUpperCase()

  parts.push(keyDisplay)

  return parts.join(isMac ? '' : '+')
}

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Keyboard,
  Navigation,
  Zap,
  Settings,
  Edit3,
  Search,
  FileText,
  Grid3X3,
  Link2,
  FolderOpen,
  Target,
  Home,
} from 'lucide-react'

interface ShortcutItem {
  keys: string[]
  description: string
  icon?: React.ReactNode
}

interface ShortcutCategory {
  name: string
  icon: React.ReactNode
  shortcuts: ShortcutItem[]
}

const isMac = typeof window !== 'undefined' && navigator.platform.includes('Mac')
const modKey = isMac ? '⌘' : 'Ctrl'

const shortcutCategories: ShortcutCategory[] = [
  {
    name: 'Navigation',
    icon: <Navigation className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Shift', 'G'], description: 'Go to Dashboard', icon: <Home className="w-4 h-4" /> },
      { keys: ['Shift', 'N'], description: 'Go to Notes', icon: <FileText className="w-4 h-4" /> },
      { keys: ['Shift', 'B'], description: 'Go to Boards', icon: <Grid3X3 className="w-4 h-4" /> },
      { keys: ['Shift', 'L'], description: 'Go to Links', icon: <Link2 className="w-4 h-4" /> },
      { keys: ['Shift', 'F'], description: 'Go to Files', icon: <FolderOpen className="w-4 h-4" /> },
      { keys: ['Shift', 'T'], description: 'Go to Goals', icon: <Target className="w-4 h-4" /> },
      { keys: ['Shift', 'S'], description: 'Go to Settings', icon: <Settings className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Quick Actions',
    icon: <Zap className="w-4 h-4" />,
    shortcuts: [
      { keys: [modKey, 'K'], description: 'Open global search', icon: <Search className="w-4 h-4" /> },
      { keys: ['?'], description: 'Open keyboard shortcuts' },
      { keys: ['G', 'G'], description: 'Scroll to top (double tap)' },
    ],
  },
  {
    name: 'General',
    icon: <Edit3 className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Esc'], description: 'Close dialog / Cancel' },
    ],
  },
]

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-500" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto pr-2 space-y-6 max-h-[60vh]">
          {shortcutCategories.map((category) => (
            <div key={category.name}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                {category.icon}
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {shortcut.icon && (
                        <span className="text-muted-foreground">{shortcut.icon}</span>
                      )}
                      <span className="text-sm">{shortcut.description}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 text-xs font-mono bg-muted border rounded min-w-[28px] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t text-center text-xs text-muted-foreground">
          <p>Press <kbd className="px-1 py-0.5 bg-muted rounded">?</kbd> anywhere to open this dialog</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Open shortcuts dialog on '?' or Shift+/
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {children}
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

// Keyboard shortcut indicator button
export function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-4 h-4" />
      </button>
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

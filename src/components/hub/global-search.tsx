'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  FileText,
  Link2,
  Target,
  ShoppingBag,
  Grid3X3,
  Loader2,
  Command,
  Layout,
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'note' | 'link' | 'goal' | 'asset' | 'board' | 'page'
  title: string
  description: string | null
  url: string
  matchedField: string
}

const typeIcons = {
  note: FileText,
  link: Link2,
  goal: Target,
  asset: ShoppingBag,
  board: Grid3X3,
  page: Layout,
}

const typeLabels = {
  note: 'Note',
  link: 'Link',
  goal: 'Goal',
  asset: 'Asset',
  board: 'Board',
  page: 'Page',
}

const typeColors = {
  note: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  link: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  goal: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  asset: 'bg-green-500/10 text-green-500 border-green-500/20',
  board: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  page: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const navigateToResult = useCallback((result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.url)
  }, [router])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateToResult(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [results, selectedIndex, navigateToResult])

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!text || !searchQuery) return text
    const parts = text.split(new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-amber-500/30 text-foreground rounded px-0.5">{part}</mark>
        : part
    )
  }

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border rounded-lg hover:border-primary/50 hover:text-foreground transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-muted rounded">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, notes, links, goals..."
              className="border-0 focus-visible:ring-0 text-lg py-6"
              autoFocus
            />
            {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />}
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Type at least 2 characters to search</p>
                <p className="text-xs mt-2">
                  Search pages, notes, links, goals, assets, and boards
                </p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No results found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type]
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => navigateToResult(result)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                        index === selectedIndex ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium truncate">
                            {highlightMatch(result.title, query)}
                          </span>
                          <Badge variant="outline" className={`shrink-0 ${typeColors[result.type]}`}>
                            {typeLabels[result.type]}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {highlightMatch(result.description, query)}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t bg-muted/30">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">esc</kbd>
                close
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

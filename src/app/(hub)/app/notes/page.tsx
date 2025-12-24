'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Plus, Search, Pin, PinOff, Edit2, Trash2, Loader2, Sparkles, Lightbulb, Building2, CheckCircle2, BookOpen, X, Mic, MicOff, Square } from 'lucide-react'
import { useVoiceRecording } from '@/hooks/use-voice-recording'
import type { Tables } from '@/types/database'

type Note = Tables<'notes'>

interface NoteInsights {
  summary: string
  keyTakeaways: string[]
  industryContext: {
    headline: string
    insight: string
    companies: string[]
    source: string
  }
  actionItems: string[]
  relatedTopics: string[]
}

function NotesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [saving, setSaving] = useState(false)

  // AI Insights state
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [currentInsights, setCurrentInsights] = useState<NoteInsights | null>(null)
  const [insightsNote, setInsightsNote] = useState<Note | null>(null)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [pinned, setPinned] = useState(false)

  // Voice recording
  const { isRecording, isTranscribing, toggleRecording } = useVoiceRecording({
    onTranscription: (text) => {
      setContent(prev => prev ? `${prev}\n\n${text}` : text)
    },
    onError: (err) => {
      console.error('Voice recording error:', err)
    },
  })

  const fetchInsights = async (note: Note) => {
    if (!note.content || note.content.length < 20) {
      return
    }

    setInsightsNote(note)
    setInsightsOpen(true)
    setInsightsLoading(true)
    setCurrentInsights(null)
    setInsightsError(null)

    try {
      const response = await fetch('/api/ai/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: note.id,
          title: note.title,
          content: note.content,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success && data.insights) {
        setCurrentInsights(data.insights)
      } else {
        setInsightsError(data.error || 'Failed to generate AI insights. Please try again.')
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error)
      setInsightsError('Network error. Please check your connection and try again.')
    } finally {
      setInsightsLoading(false)
    }
  }

  const fetchNotes = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    const { data, error } = await query
    if (!error && data) {
      setNotes(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openNewDialog()
      router.replace('/app/notes')
    }
  }, [searchParams, router])

  const openNewDialog = () => {
    setEditingNote(null)
    setTitle('')
    setContent('')
    setTags('')
    setPinned(false)
    setDialogOpen(true)
  }

  const openEditDialog = (note: Note) => {
    setEditingNote(note)
    setTitle(note.title)
    setContent(note.content || '')
    setTags(note.tags?.join(', ') || '')
    setPinned(note.pinned)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const noteData = {
      title,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      pinned,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (editingNote) {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('notes').update(noteData).eq('id', editingNote.id)
    } else {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('notes').insert(noteData)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchNotes()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    const supabase = createClient()
    await supabase.from('notes').delete().eq('id', id)
    fetchNotes()
  }

  const handleTogglePin = async (note: Note) => {
    const supabase = createClient()
    // @ts-expect-error - Supabase types not fully inferred at build time
    await supabase.from('notes').update({ pinned: !note.pinned, updated_at: new Date().toISOString() }).eq('id', note.id)
    fetchNotes()
  }

  // Get all unique tags for filtering
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])))

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = search === '' ||
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      (note.content?.toLowerCase().includes(search.toLowerCase()))
    const matchesTag = tagFilter === '' ||
      (note.tags?.includes(tagFilter))
    return matchesSearch && matchesTag
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notes</h1>
          <p className="text-muted-foreground mt-1">Create and manage your notes.</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={tagFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTagFilter('')}
            >
              All
            </Button>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={tagFilter === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTagFilter(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {notes.length === 0 ? 'No notes yet' : 'No notes match your filters'}
            </p>
            {notes.length === 0 && (
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first note
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => (
            <Card key={note.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {note.pinned && <Pin className="w-4 h-4 text-primary" />}
                    {note.title}
                  </CardTitle>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {note.content && note.content.length >= 20 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                        onClick={() => fetchInsights(note)}
                        title="AI Insights"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleTogglePin(note)}
                    >
                      {note.pinned ? (
                        <PinOff className="w-4 h-4" />
                      ) : (
                        <Pin className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(note)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {note.content && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {note.content}
                  </p>
                )}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {note.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Edit Note' : 'Create Note'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                <div className="flex items-center gap-2">
                  {isTranscribing && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Transcribing...
                    </span>
                  )}
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={toggleRecording}
                    disabled={isTranscribing}
                    className="gap-2"
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-3 h-3" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3" />
                        Voice
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note content here or use voice recording... (Markdown supported)"
                rows={8}
              />
              {isRecording && (
                <p className="text-xs text-destructive animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  Recording... Click Stop when done.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="work, ideas, todo"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pinned"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="pinned" className="cursor-pointer">
                Pin this note
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingNote ? 'Save Changes' : 'Create Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Insights Sheet */}
      <Sheet open={insightsOpen} onOpenChange={setInsightsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AI Insights
            </SheetTitle>
            {insightsNote && (
              <p className="text-sm text-muted-foreground truncate">
                {insightsNote.title}
              </p>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {insightsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing your note...</p>
                <p className="text-xs text-muted-foreground mt-1">Finding relevant industry insights</p>
              </div>
            ) : insightsError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <X className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive mb-2">
                  Unable to Generate Insights
                </p>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  {insightsError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insightsNote && fetchInsights(insightsNote)}
                >
                  Try Again
                </Button>
              </div>
            ) : currentInsights ? (
              <div className="space-y-6 py-4">
                {/* Summary */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Summary
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentInsights.summary}
                  </p>
                </div>

                {/* Key Takeaways */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Key Takeaways
                  </h3>
                  <ul className="space-y-2">
                    {currentInsights.keyTakeaways.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Industry Context */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Industry Context
                  </h3>
                  <p className="text-sm font-medium text-foreground mb-2">
                    {currentInsights.industryContext.headline}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {currentInsights.industryContext.insight}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {currentInsights.industryContext.companies.map((company, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {company}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    {currentInsights.industryContext.source}
                  </p>
                </div>

                {/* Action Items */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    Action Items
                  </h3>
                  <ul className="space-y-2">
                    {currentInsights.actionItems.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs flex-shrink-0">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Related Topics */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    Related Topics to Explore
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentInsights.relatedTopics.map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select a note to get AI-powered insights
                </p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function NotesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NotesContent />
    </Suspense>
  )
}

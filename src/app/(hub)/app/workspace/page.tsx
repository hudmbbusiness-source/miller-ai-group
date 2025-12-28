'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit2,
  Loader2,
  Sparkles,
  Mic,
  MicOff,
  Paperclip,
  Link as LinkIcon,
  X,
  ExternalLink,
  MoreHorizontal,
  Grid3X3,
  Image as ImageIcon,
  ShoppingBag,
  Heart,
  Target,
  CheckCircle2,
  Calendar,
  Pause,
  Package,
  DollarSign,
  Star,
} from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import type { Tables } from '@/types/database'
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  type Goal,
} from '@/lib/actions/goals'

// Types
type Note = Tables<'notes'>
type Board = Tables<'boards'>

interface Asset {
  id: string
  user_id: string
  name: string
  description: string | null
  category: 'want' | 'owned' | 'goal'
  priority: number
  price: number | null
  url: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Priority and status configurations
const priorityColors = {
  0: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  1: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  2: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const priorityLabels = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
}

const statusColors = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paused: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  abandoned: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const categoryLabels = {
  short_term: 'Short Term',
  long_term: 'Long Term',
  milestone: 'Milestone',
}

const assetCategoryColors = {
  want: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  owned: 'bg-green-500/10 text-green-500 border-green-500/20',
  goal: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

const assetCategoryLabels = {
  want: 'Want',
  owned: 'Owned',
  goal: 'Goal',
}

// ============= NOTES TAB COMPONENT =============
function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)

  // AI Features
  const [aiInsight, setAiInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [factQuery, setFactQuery] = useState('')
  const [factResult, setFactResult] = useState('')
  const [loadingFact, setLoadingFact] = useState(false)

  // Voice recording
  const [isRecording, setIsRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Attachments
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [showAttachmentInput, setShowAttachmentInput] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const fetchNotes = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setNotes(data)
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0])
      }
    }
    setLoading(false)
  }, [selectedNote])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleCreateNote = async () => {
    if (!newTitle.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: newTitle,
        content: newContent,
        user_id: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      setNotes([data, ...notes])
      setSelectedNote(data)
      setIsCreating(false)
      setNewTitle('')
      setNewContent('')
    }
    setSaving(false)
  }

  const handleUpdateNote = async () => {
    if (!selectedNote || !editTitle.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('notes')
      .update({
        title: editTitle,
        content: editContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedNote.id)

    if (!error) {
      const updated = { ...selectedNote, title: editTitle, content: editContent }
      setNotes(notes.map(n => n.id === selectedNote.id ? updated : n))
      setSelectedNote(updated)
      setIsEditing(false)
    }
    setSaving(false)
  }

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return

    const supabase = createClient()
    await supabase.from('notes').delete().eq('id', id)

    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (selectedNote?.id === id) {
      setSelectedNote(remaining[0] || null)
    }
  }

  const startEditing = () => {
    if (selectedNote) {
      setEditTitle(selectedNote.title)
      setEditContent(selectedNote.content || '')
      setIsEditing(true)
    }
  }

  // AI Insights
  const getAIInsight = async () => {
    if (!selectedNote?.content) return
    setLoadingInsight(true)
    setAiInsight('')

    try {
      const response = await fetch('/api/ai/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insight',
          content: selectedNote.content,
        }),
      })
      const data = await response.json()
      setAiInsight(data.insight || 'No insights available.')
    } catch {
      setAiInsight('Failed to get insights.')
    }
    setLoadingInsight(false)
  }

  // Fact Search
  const searchFact = async () => {
    if (!factQuery.trim()) return
    setLoadingFact(true)
    setFactResult('')

    try {
      const response = await fetch('/api/ai/fact-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: factQuery }),
      })
      const data = await response.json()
      setFactResult(data.result || 'No results found.')
    } catch {
      setFactResult('Failed to search.')
    }
    setLoadingFact(false)
  }

  // Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        setTranscribing(true)
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', audioBlob)

        try {
          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          })
          const data = await response.json()
          if (data.text) {
            if (isEditing) {
              setEditContent(prev => prev + '\n\n' + data.text)
            } else if (isCreating) {
              setNewContent(prev => prev + '\n\n' + data.text)
            }
          }
        } catch (err) {
          console.error('Transcription failed:', err)
        }
        setTranscribing(false)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedNote) return

    setUploadingFile(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const filePath = `${user.id}/${selectedNote.id}/${file.name}`
    const { error } = await supabase.storage
      .from('note-attachments')
      .upload(filePath, file)

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('note-attachments')
        .getPublicUrl(filePath)

      const attachments = selectedNote.attachments || []
      await supabase
        .from('notes')
        .update({
          attachments: [...attachments, { name: file.name, url: publicUrl }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedNote.id)

      fetchNotes()
    }
    setUploadingFile(false)
  }

  // Add Link
  const addLink = async () => {
    if (!linkUrl.trim() || !selectedNote) return

    const supabase = createClient()
    const links = selectedNote.links || []
    await supabase
      .from('notes')
      .update({
        links: [...links, { title: linkTitle || linkUrl, url: linkUrl }],
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedNote.id)

    setLinkUrl('')
    setLinkTitle('')
    setShowLinkInput(false)
    fetchNotes()
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Notes List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="flex-shrink-0 pb-2">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-lg">Notes</CardTitle>
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-2">
          <div className="space-y-2">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => { setSelectedNote(note); setIsEditing(false); }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{note.title}</h4>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {note.content?.slice(0, 50) || 'No content'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No notes found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Note Editor / Viewer */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardContent className="flex-1 overflow-auto p-4">
          {isCreating ? (
            <div className="space-y-4">
              <Input
                placeholder="Note title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-lg font-medium"
              />
              <Textarea
                placeholder="Start writing..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[300px] resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={transcribing}
                >
                  {transcribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4 text-red-500" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateNote} disabled={saving || !newTitle.trim()}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Note
                </Button>
                <Button variant="outline" onClick={() => { setIsCreating(false); setNewTitle(''); setNewContent(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : selectedNote ? (
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-lg font-medium"
                  />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[300px] resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={transcribing}
                    >
                      {transcribing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isRecording ? (
                        <MicOff className="w-4 h-4 text-red-500" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLinkInput(!showLinkInput)}
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  {showLinkInput && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Title (optional)"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={addLink}>Add</Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateNote} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold">{selectedNote.title}</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={startEditing}>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={getAIInsight}
                        disabled={loadingInsight}
                      >
                        {loadingInsight ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-1" />
                        )}
                        Insights
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{selectedNote.content || 'No content'}</p>
                  </div>

                  {/* Attachments */}
                  {selectedNote.attachments && selectedNote.attachments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Attachments</h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedNote.attachments as Array<{name: string, url: string}>).map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
                          >
                            <Paperclip className="w-3 h-3" />
                            {att.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {selectedNote.links && selectedNote.links.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Links</h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedNote.links as Array<{title: string, url: string}>).map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {link.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Insight */}
                  {aiInsight && (
                    <Card className="mt-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-violet-400" />
                          <span className="font-medium text-violet-400">AI Insight</span>
                        </div>
                        <p className="text-sm">{aiInsight}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Fact Search */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Quick Fact Search</h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search for a fact..."
                        value={factQuery}
                        onChange={(e) => setFactQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchFact()}
                      />
                      <Button onClick={searchFact} disabled={loadingFact}>
                        {loadingFact ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {factResult && (
                      <p className="mt-2 text-sm text-muted-foreground">{factResult}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a note or create a new one</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============= BOARDS TAB COMPONENT =============
function BoardsTab() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const fetchBoards = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setBoards(data)
    }
    setLoading(false)
  }, [])

  const openNewDialog = useCallback(() => {
    setEditingBoard(null)
    setName('')
    setDescription('')
    setDialogOpen(true)
  }, [])

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openNewDialog()
      router.replace('/app/workspace')
    }
  }, [searchParams, router, openNewDialog])

  const openEditDialog = (board: Board) => {
    setEditingBoard(board)
    setName(board.name)
    setDescription(board.description || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const boardData = {
      name,
      description,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (editingBoard) {
      await supabase.from('boards').update(boardData).eq('id', editingBoard.id)
    } else {
      await supabase.from('boards').insert(boardData)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchBoards()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this board and all its pins?')) return

    const supabase = createClient()
    await supabase.from('pins').delete().eq('board_id', id)
    await supabase.from('boards').delete().eq('id', id)
    fetchBoards()
  }

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
        <p className="text-muted-foreground">Organize your pins in boards.</p>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Board
        </Button>
      </div>

      {boards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No boards yet</p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <Card key={board.id} className="group hover:border-primary/50 transition-colors">
              <Link href={`/app/boards/${board.id}`}>
                <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative">
                  {board.cover_image ? (
                    <Image
                      src={board.cover_image}
                      alt={board.name}
                      fill
                      className="object-cover rounded-t-lg"
                      unoptimized
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                  )}
                </div>
              </Link>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Link href={`/app/boards/${board.id}`}>
                    <CardTitle className="text-lg hover:text-primary transition-colors">
                      {board.name}
                    </CardTitle>
                  </Link>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        openEditDialog(board)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(board.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {board.description && (
                  <CardDescription className="line-clamp-2">
                    {board.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? 'Edit Board' : 'Create Board'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingBoard ? 'Save Changes' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============= ASSETS TAB COMPONENT =============
function AssetsTab() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'want' | 'owned' | 'goal'>('all')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'want' | 'owned' | 'goal'>('want')
  const [priority, setPriority] = useState<number>(1)
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Product Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{name: string, price: string, url: string, image: string}>>([])
  const [searching, setSearching] = useState(false)

  const fetchAssets = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setAssets(data as Asset[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const resetForm = () => {
    setName('')
    setDescription('')
    setCategory('want')
    setPriority(1)
    setPrice('')
    setUrl('')
    setImageUrl('')
    setNotes('')
    setEditingAsset(null)
  }

  const openDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset)
      setName(asset.name)
      setDescription(asset.description || '')
      setCategory(asset.category)
      setPriority(asset.priority)
      setPrice(asset.price?.toString() || '')
      setUrl(asset.url || '')
      setImageUrl(asset.image_url || '')
      setNotes(asset.notes || '')
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const assetData = {
      name,
      description: description || null,
      category,
      priority,
      price: price ? parseFloat(price) : null,
      url: url || null,
      image_url: imageUrl || null,
      notes: notes || null,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (editingAsset) {
      await supabase.from('assets').update(assetData).eq('id', editingAsset.id)
    } else {
      await supabase.from('assets').insert(assetData)
    }

    setSaving(false)
    setDialogOpen(false)
    resetForm()
    fetchAssets()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return

    const supabase = createClient()
    await supabase.from('assets').delete().eq('id', id)
    fetchAssets()
  }

  const searchProducts = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)

    try {
      const response = await fetch('/api/ai/product-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch {
      console.error('Search failed')
    }
    setSearching(false)
  }

  const addFromSearch = (result: {name: string, price: string, url: string, image: string}) => {
    setName(result.name)
    setPrice(result.price.replace(/[^0-9.]/g, ''))
    setUrl(result.url)
    setImageUrl(result.image)
    setSearchResults([])
    setSearchQuery('')
    setDialogOpen(true)
  }

  const filteredAssets = assets.filter(asset => {
    if (filter === 'all') return true
    return asset.category === filter
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-muted-foreground">Track things you want, own, or are saving for.</p>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Product Search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
            />
            <Button onClick={searchProducts} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 grid gap-2">
              {searchResults.map((result, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                  {result.image && (
                    <Image src={result.image} alt={result.name} width={48} height={48} className="rounded object-cover" unoptimized />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.name}</p>
                    <p className="text-sm text-muted-foreground">{result.price}</p>
                  </div>
                  <Button size="sm" onClick={() => addFromSearch(result)}>Add</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'want', 'owned', 'goal'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'want' ? 'Want' : f === 'owned' ? 'Owned' : 'Goals'}
          </Button>
        ))}
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map(asset => (
            <Card key={asset.id} className="group overflow-hidden">
              {asset.image_url && (
                <div className="aspect-square relative bg-muted">
                  <Image
                    src={asset.image_url}
                    alt={asset.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{asset.name}</h3>
                    {asset.price && (
                      <p className="text-sm text-green-500 flex items-center gap-1 mt-1">
                        <DollarSign className="w-3 h-3" />
                        {asset.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(asset)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {asset.url && (
                        <DropdownMenuItem onClick={() => window.open(asset.url!, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Link
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(asset.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={assetCategoryColors[asset.category]}>
                    {assetCategoryLabels[asset.category]}
                  </Badge>
                  <Badge variant="outline" className={priorityColors[asset.priority as 0 | 1 | 2]}>
                    {priorityLabels[asset.priority as 0 | 1 | 2]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want">Want</SelectItem>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority.toString()} onValueChange={(v) => setPriority(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Low</SelectItem>
                    <SelectItem value="1">Medium</SelectItem>
                    <SelectItem value="2">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingAsset ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============= GOALS TAB COMPONENT =============
function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'short_term' | 'long_term' | 'milestone'>('short_term')
  const [priority, setPriority] = useState<number>(1)
  const [targetDate, setTargetDate] = useState('')

  const loadGoals = useCallback(async () => {
    setIsLoading(true)
    const data = await getGoals()
    setGoals(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('short_term')
    setPriority(1)
    setTargetDate('')
    setEditingGoal(null)
  }

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal)
      setTitle(goal.title)
      setDescription(goal.description || '')
      setCategory(goal.category as 'short_term' | 'long_term' | 'milestone')
      setPriority(goal.priority)
      setTargetDate(goal.target_date || '')
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return

    if (editingGoal) {
      await updateGoal(editingGoal.id, {
        title,
        description: description || null,
        category,
        priority,
        target_date: targetDate || null,
      })
    } else {
      await createGoal({
        title,
        description: description || undefined,
        category,
        priority,
        target_date: targetDate || undefined,
      })
    }

    setIsDialogOpen(false)
    resetForm()
    loadGoals()
  }

  const handleComplete = async (id: string) => {
    await completeGoal(id)
    loadGoals()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return
    await deleteGoal(id)
    loadGoals()
  }

  const handleStatusChange = async (id: string, status: Goal['status']) => {
    await updateGoal(id, { status })
    loadGoals()
  }

  const filteredGoals = goals.filter((goal) => {
    if (filter === 'all') return true
    if (filter === 'active') return goal.status === 'active'
    if (filter === 'completed') return goal.status === 'completed'
    return true
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-muted-foreground">Track your short-term and long-term goals.</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Goal'}</DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Update your goal details.' : 'Add a new goal to track.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you want to achieve?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_term">Short Term</SelectItem>
                      <SelectItem value="long_term">Long Term</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority.toString()} onValueChange={(v) => setPriority(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Low</SelectItem>
                      <SelectItem value="1">Medium</SelectItem>
                      <SelectItem value="2">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date (optional)</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!title.trim()}>
                {editingGoal ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'active'
                ? 'No active goals. Add one to get started!'
                : filter === 'completed'
                ? 'No completed goals yet.'
                : 'No goals found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {goal.status === 'active' ? (
                    <button
                      onClick={() => handleComplete(goal.id)}
                      className="mt-1 text-muted-foreground hover:text-green-500 transition-colors"
                      title="Mark as complete"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="mt-1">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3
                          className={`font-medium ${goal.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={priorityColors[goal.priority as 0 | 1 | 2]}>
                          {priorityLabels[goal.priority as 0 | 1 | 2]}
                        </Badge>
                        <Badge variant="outline">
                          {categoryLabels[goal.category as keyof typeof categoryLabels]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      {goal.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(goal.target_date)}
                        </span>
                      )}
                      <Badge variant="outline" className={statusColors[goal.status]}>
                        {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(goal)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {goal.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStatusChange(goal.id, 'paused')}
                        className="h-8 w-8"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(goal.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============= MAIN WORKSPACE PAGE =============
export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState('notes')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workspace</h1>
        <p className="text-muted-foreground mt-1">Your personal productivity hub for notes, boards, assets, and goals.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-12 w-full sm:w-auto">
            <TabsTrigger value="notes" className="flex items-center gap-2 px-4">
              <FileText className="w-4 h-4" />
              <span>Notes</span>
            </TabsTrigger>
            <TabsTrigger value="boards" className="flex items-center gap-2 px-4">
              <Grid3X3 className="w-4 h-4" />
              <span>Boards</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2 px-4">
              <ShoppingBag className="w-4 h-4" />
              <span>Assets</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2 px-4">
              <Target className="w-4 h-4" />
              <span>Goals</span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="notes" className="mt-6">
          <NotesTab />
        </TabsContent>

        <TabsContent value="boards" className="mt-6">
          <BoardsTab />
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <AssetsTab />
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <GoalsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

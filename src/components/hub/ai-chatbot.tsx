'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Brain,
  Send,
  Loader2,
  Mic,
  Square,
  User,
  AlertCircle,
  Globe,
  Plus,
  Trash2,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  FolderPlus,
  Folder,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  X,
  Settings,
} from 'lucide-react'
import { useVoiceRecording } from '@/hooks/use-voice-recording'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  project_id?: string | null
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  name: string
  color: string
  icon: string
  created_at: string
}

interface Memory {
  id: string
  content: string
  category: string
  created_at: string
}

interface ChatContext {
  includeGoals?: boolean
  includeNotes?: boolean
  enableWebSearch?: boolean
}

export function AIChatbot() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['none']))
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showMemories, setShowMemories] = useState(false)
  const [newMemory, setNewMemory] = useState('')
  const [context] = useState<ChatContext>({
    includeGoals: true,
    includeNotes: false,
    enableWebSearch: true,
  })
  const [webSearchAvailable, setWebSearchAvailable] = useState(false)
  const [lastSearchUsed, setLastSearchUsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Voice recording
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const { isRecording, isTranscribing, toggleRecording } = useVoiceRecording({
    onTranscription: (text) => {
      setVoiceError(null)
      setInput(prev => prev ? `${prev} ${text}` : text)
      textareaRef.current?.focus()
    },
    onError: (err) => {
      console.error('Voice recording error:', err)
      setVoiceError(err)
      setTimeout(() => setVoiceError(null), 5000)
    },
  })

  // Load data from APIs
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (e) {
      console.error('Failed to load conversations:', e)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (e) {
      console.error('Failed to load projects:', e)
    }
  }, [])

  const loadMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/memories')
      const data = await res.json()
      if (data.memories) {
        setMemories(data.memories)
      }
    } catch (e) {
      console.error('Failed to load memories:', e)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    loadProjects()
    loadMemories()
  }, [loadConversations, loadProjects, loadMemories])

  // Check if AI is configured
  useEffect(() => {
    fetch('/api/ai/chat')
      .then(res => res.json())
      .then(data => {
        setIsConfigured(data.configured === true)
        setWebSearchAvailable(data.webSearchEnabled === true)
      })
      .catch(() => {
        setIsConfigured(false)
        setWebSearchAvailable(false)
      })
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  // Load conversation messages when switching
  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find(c => c.id === currentConversationId)
      if (conv) {
        setMessages(conv.messages || [])
        setCurrentProjectId(conv.project_id || null)
      }
    }
  }, [currentConversationId, conversations])

  const createNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
    setError(null)
  }

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (currentConversationId === id) {
        setCurrentConversationId(null)
        setMessages([])
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
  }

  const moveToProject = async (convId: string, projectId: string | null) => {
    try {
      await fetch('/api/conversations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId, project_id: projectId }),
      })
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, project_id: projectId } : c)
      )
    } catch (e) {
      console.error('Failed to move conversation:', e)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      })
      const data = await res.json()
      if (data.project) {
        setProjects(prev => [data.project, ...prev])
        setExpandedProjects(prev => new Set([...prev, data.project.id]))
      }
      setNewProjectName('')
      setShowNewProject(false)
    } catch (e) {
      console.error('Failed to create project:', e)
    }
  }

  const deleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
      setProjects(prev => prev.filter(p => p.id !== id))
      // Conversations in this project will have project_id set to null by DB cascade
      setConversations(prev =>
        prev.map(c => c.project_id === id ? { ...c, project_id: null } : c)
      )
    } catch (e) {
      console.error('Failed to delete project:', e)
    }
  }

  const addMemory = async () => {
    if (!newMemory.trim()) return
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMemory.trim() }),
      })
      const data = await res.json()
      if (data.memory) {
        setMemories(prev => [data.memory, ...prev])
      }
      setNewMemory('')
    } catch (e) {
      console.error('Failed to add memory:', e)
    }
  }

  const deleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memories?id=${id}`, { method: 'DELETE' })
      setMemories(prev => prev.filter(m => m.id !== id))
    } catch (e) {
      console.error('Failed to delete memory:', e)
    }
  }

  const saveConversation = async (msgs: Message[], title: string) => {
    setIsSaving(true)
    try {
      if (currentConversationId) {
        const res = await fetch('/api/conversations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentConversationId, messages: msgs }),
        })
        const data = await res.json()
        if (data.conversation) {
          setConversations(prev =>
            prev.map(c => c.id === currentConversationId ? data.conversation : c)
          )
        }
      } else {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, messages: msgs, project_id: currentProjectId }),
        })
        const data = await res.json()
        if (data.conversation) {
          setConversations(prev => [data.conversation, ...prev])
          setCurrentConversationId(data.conversation.id)
        }
      }
    } catch (e) {
      console.error('Failed to save conversation:', e)
    } finally {
      setIsSaving(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    setError(null)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content.length > 4000 ? m.content.slice(0, 4000) + "..." : m.content,
          })),
          context,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to get response')
      }

      setLastSearchUsed(data.webSearchUsed === true)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      }

      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)

      // Save to Supabase
      const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '')
      await saveConversation(updatedMessages, title)

    } catch (err) {
      console.error('Chat error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Group conversations by project
  const ungroupedConversations = conversations.filter(c => !c.project_id)
  const conversationsByProject = projects.map(project => ({
    project,
    conversations: conversations.filter(c => c.project_id === project.id),
  }))

  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full bg-background">
      {/* Left Sidebar - Conversations & Projects */}
      <div
        className={cn(
          'flex-shrink-0 border-r bg-muted/30 flex flex-col transition-all duration-300',
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b space-y-2">
          <Button
            onClick={createNewConversation}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowNewProject(true)}
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Project
            </Button>
            <Dialog open={showMemories} onOpenChange={setShowMemories}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Memory
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    BrainBox Memory
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mb-4">
                  Add facts about yourself that BrainBox will remember across all conversations.
                </p>
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    placeholder="e.g., I'm a CS student at UNC Charlotte"
                    onKeyDown={(e) => e.key === 'Enter' && addMemory()}
                  />
                  <Button onClick={addMemory} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {memories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No memories yet. Add some facts about yourself!
                    </p>
                  ) : (
                    memories.map((memory) => (
                      <div
                        key={memory.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 group"
                      >
                        <p className="flex-1 text-sm">{memory.content}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-50 group-hover:opacity-100"
                          onClick={() => deleteMemory(memory.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* New Project Input */}
        {showNewProject && (
          <div className="p-3 border-b bg-muted/50">
            <div className="flex gap-2">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
                autoFocus
              />
              <Button size="sm" onClick={createProject}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewProject(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Ungrouped Conversations */}
          <div className="mb-2">
            <button
              onClick={() => toggleProject('none')}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {expandedProjects.has('none') ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Recent Chats
              <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                {ungroupedConversations.length}
              </span>
            </button>
            {expandedProjects.has('none') && (
              <div className="mt-1 space-y-0.5">
                {ungroupedConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={currentConversationId === conv.id}
                    projects={projects}
                    onSelect={() => setCurrentConversationId(conv.id)}
                    onDelete={() => deleteConversation(conv.id)}
                    onMove={(projectId) => moveToProject(conv.id, projectId)}
                  />
                ))}
                {ungroupedConversations.length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-2">No chats yet</p>
                )}
              </div>
            )}
          </div>

          {/* Project Groups */}
          {conversationsByProject.map(({ project, conversations: projectConvs }) => (
            <div key={project.id} className="mb-2">
              <div className="flex items-center group">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="flex items-center gap-2 flex-1 px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  {expandedProjects.has(project.id) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Folder className="w-3 h-3" style={{ color: project.color }} />
                  <span className="truncate">{project.name}</span>
                  <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {projectConvs.length}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteProject(project.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
              {expandedProjects.has(project.id) && (
                <div className="mt-1 space-y-0.5 ml-2">
                  {projectConvs.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversationId === conv.id}
                      projects={projects}
                      onSelect={() => setCurrentConversationId(conv.id)}
                      onDelete={() => deleteConversation(conv.id)}
                      onMove={(projectId) => moveToProject(conv.id, projectId)}
                    />
                  ))}
                  {projectConvs.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">No chats in project</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeft className="w-5 h-5" />
              )}
            </Button>
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20">
              <Brain className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg">BrainBox</h1>
              <div className="flex items-center gap-2 text-xs">
                {webSearchAvailable && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Globe className="w-3 h-3" />
                    Web
                  </span>
                )}
                {memories.length > 0 && (
                  <span className="flex items-center gap-1 text-purple-500">
                    <Sparkles className="w-3 h-3" />
                    {memories.length} memories
                  </span>
                )}
              </div>
            </div>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={createNewConversation}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="p-5 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 mb-6">
                  <Brain className="w-12 h-12 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">How can I help?</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {memories.length > 0
                    ? `I remember ${memories.length} things about you. Ask me anything!`
                    : 'Ask me anything. I can search the web for current information.'}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {['Help me plan my career', 'What should I learn next?', 'Give me project ideas'].map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="lg"
                      className="rounded-full"
                      onClick={() => setInput(s)}
                      disabled={!isConfigured}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-4',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-amber-500" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        message.role === 'user'
                          ? 'bg-amber-500 text-black'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-black" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                      <span className="text-sm text-muted-foreground">
                        {webSearchAvailable ? 'Searching & thinking...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                )}
                {lastSearchUsed && messages.length > 0 && !isLoading && (
                  <div className="flex items-center gap-2 text-sm text-green-600 ml-13">
                    <Globe className="w-4 h-4" />
                    <span>Used live web data</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {voiceError && (
              <div className="mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{voiceError}</p>
              </div>
            )}
            {!isConfigured && (
              <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-500">AI not configured. Please add GROQ_API_KEY.</p>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? 'Recording...' : 'Ask me anything...'}
                  className="min-h-[52px] max-h-[150px] resize-none text-sm rounded-xl border-2 focus:border-amber-500"
                  rows={1}
                  disabled={isLoading || isRecording || !isConfigured}
                />
              </div>
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                size="icon"
                onClick={toggleRecording}
                disabled={isTranscribing || isLoading || !isConfigured}
                className={cn('h-[52px] w-[52px] rounded-xl', isRecording && 'animate-pulse')}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || isRecording || !isConfigured}
                className="h-[52px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Conversation Item Component
function ConversationItem({
  conversation,
  isActive,
  projects,
  onSelect,
  onDelete,
  onMove,
}: {
  conversation: Conversation
  isActive: boolean
  projects: Project[]
  onSelect: () => void
  onDelete: () => void
  onMove: (projectId: string | null) => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        isActive
          ? 'bg-amber-500/10 border border-amber-500/20'
          : 'hover:bg-muted'
      )}
      onClick={onSelect}
    >
      <MessageSquare className={cn(
        'w-4 h-4 flex-shrink-0',
        isActive ? 'text-amber-500' : 'text-muted-foreground'
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm truncate',
          isActive ? 'font-medium' : ''
        )}>
          {conversation.title}
        </p>
      </div>

      {/* Always visible action buttons */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-50 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onMove(null)
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Move to Recent
          </DropdownMenuItem>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={(e) => {
                e.stopPropagation()
                onMove(project.id)
              }}
            >
              <Folder className="w-4 h-4 mr-2" style={{ color: project.color }} />
              Move to {project.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

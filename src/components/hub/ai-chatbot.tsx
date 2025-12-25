'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  Send,
  Loader2,
  Mic,
  Square,
  User,
  Sparkles,
  RefreshCw,
  Target,
  FileText,
  AlertCircle,
  MessageSquare,
  Trash2,
  Plus,
  ChevronLeft,
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
  created_at: string
  updated_at: string
}

interface ChatContext {
  includeGoals?: boolean
  includeNotes?: boolean
}

export function AIChatbot() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [context, setContext] = useState<ChatContext>({
    includeGoals: true,
    includeNotes: false,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Voice recording
  const { isRecording, isTranscribing, toggleRecording } = useVoiceRecording({
    onTranscription: (text) => {
      setInput(prev => prev ? `${prev} ${text}` : text)
      textareaRef.current?.focus()
    },
    onError: (err) => {
      console.error('Voice recording error:', err)
    },
  })

  // Load conversations from Supabase
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

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Check if AI is configured
  useEffect(() => {
    fetch('/api/ai/chat')
      .then(res => res.json())
      .then(data => {
        setIsConfigured(data.configured === true)
      })
      .catch(() => {
        setIsConfigured(false)
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Load conversation messages when switching
  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find(c => c.id === currentConversationId)
      if (conv) {
        setMessages(conv.messages || [])
      }
    } else {
      setMessages([])
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

  const saveConversation = async (msgs: Message[], title: string) => {
    setIsSaving(true)
    try {
      if (currentConversationId) {
        // Update existing
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
        // Create new
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, messages: msgs }),
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
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          context,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to get response')
      }

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
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
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

  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[500px] max-h-[800px] gap-4">
      {/* Sidebar - Conversation List */}
      {showSidebar && (
        <Card className="w-64 flex-shrink-0 flex flex-col">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createNewConversation}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors',
                      currentConversationId === conv.id && 'bg-muted'
                    )}
                    onClick={() => setCurrentConversationId(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm truncate">{conv.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conv.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col min-w-0 border-amber-500/20">
        {/* Header */}
        <CardHeader className="flex-shrink-0 py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <ChevronLeft className={cn('w-4 h-4 transition-transform', !showSidebar && 'rotate-180')} />
              </Button>
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20">
                <Brain className="w-4 h-4 text-amber-500" />
              </div>
              <span className="font-semibold">BrainBox</span>
              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-500 border-orange-500/20">
                Groq
              </Badge>
              {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={context.includeGoals ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setContext(prev => ({ ...prev, includeGoals: !prev.includeGoals }))}
              >
                <Target className="w-3 h-3" />
                <span className="hidden sm:inline">Goals</span>
              </Button>
              <Button
                variant={context.includeNotes ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setContext(prev => ({ ...prev, includeNotes: !prev.includeNotes }))}
              >
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">Notes</span>
              </Button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7" onClick={createNewConversation}>
                  <RefreshCw className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              )}
            </div>
          </div>

          {!isConfigured && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
              <p className="text-xs text-amber-500">GROQ_API_KEY not configured</p>
            </div>
          )}

          {error && (
            <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </CardHeader>

        {/* Messages - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 mb-4">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-semibold mb-2">Hi! I&apos;m BrainBox</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Your AI assistant. Ask me anything about career, tech, or productivity!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Interview prep tips', 'Project ideas', 'Skills to learn'].map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setInput(s)}
                    disabled={!isConfigured}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="text-[10px] opacity-50 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="bg-muted rounded-2xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input - Fixed at bottom */}
        <CardContent className="flex-shrink-0 border-t p-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? 'Recording...' : 'Type a message...'}
                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                rows={1}
                disabled={isLoading || isRecording || !isConfigured}
              />
            </div>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleRecording}
              disabled={isTranscribing || isLoading || !isConfigured}
              className={cn('flex-shrink-0 h-10 w-10', isRecording && 'animate-pulse')}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isRecording || !isConfigured}
              className="flex-shrink-0 h-10 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

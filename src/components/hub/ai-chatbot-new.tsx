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
  Globe,
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
  enableWebSearch?: boolean
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
  // Hide sidebar by default on mobile
  const [showSidebar, setShowSidebar] = useState(false)
  const [context, setContext] = useState<ChatContext>({
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
      // Clear error after 5 seconds
      setTimeout(() => setVoiceError(null), 5000)
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

      // Track if web search was used
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
      let errorMsg = 'Something went wrong. Please try again.'
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMsg = 'Network error. Check your connection.'
        } else {
          errorMsg = err.message
        }
      }
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
    <div className="relative flex flex-col lg:flex-row h-full min-h-[400px] gap-0 lg:gap-4">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar - Conversation List */}
      <Card className={cn(
        "lg:w-44 xl:w-52 flex-shrink-0 flex flex-col z-50",
        // Mobile: fixed overlay from left
        "fixed lg:static inset-y-0 left-0 w-[280px] transform transition-transform duration-200",
        showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        // Desktop: always visible
        "lg:flex"
      )}>
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">History</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={createNewConversation}>
                <Plus className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 lg:hidden" onClick={() => setShowSidebar(false)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="flex-1 overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No conversations yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors min-h-[48px]',
                    currentConversationId === conv.id && 'bg-muted'
                  )}
                  onClick={() => {
                    setCurrentConversationId(conv.id)
                    setShowSidebar(false) // Close on mobile after selection
                  }}
                >
                  <MessageSquare className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate flex-1">{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col min-w-0 border-amber-500/20">
        {/* Header - Simplified for mobile */}
        <CardHeader className="flex-shrink-0 py-3 px-4 border-b">
          <div className="flex items-center justify-between gap-3">
            {/* Left side - Menu + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex-shrink-0">
                  <Brain className="w-5 h-5 text-amber-500" />
                </div>
                <span className="font-semibold text-lg">BrainBox</span>
              </div>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />}
            </div>

            {/* Right side - Just New button on mobile */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Web search indicator - icon only on mobile */}
              {webSearchAvailable && context.enableWebSearch && (
                <Globe className="w-4 h-4 text-green-500 lg:hidden" />
              )}
              {messages.length > 0 && (
                <Button variant="outline" size="sm" className="h-10 px-3" onClick={createNewConversation}>
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              )}
            </div>
          </div>

          {/* Context toggles - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex items-center gap-2 mt-3">
            {webSearchAvailable && (
              <Button
                variant={context.enableWebSearch ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  context.enableWebSearch && "bg-green-500/20 hover:bg-green-500/30 text-green-600"
                )}
                onClick={() => setContext(prev => ({ ...prev, enableWebSearch: !prev.enableWebSearch }))}
              >
                <Globe className="w-4 h-4 mr-1" />
                Web Search
              </Button>
            )}
            <Button
              variant={context.includeGoals ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setContext(prev => ({ ...prev, includeGoals: !prev.includeGoals }))}
            >
              <Target className="w-4 h-4 mr-1" />
              Goals
            </Button>
            <Button
              variant={context.includeNotes ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setContext(prev => ({ ...prev, includeNotes: !prev.includeNotes }))}
            >
              <FileText className="w-4 h-4 mr-1" />
              Notes
            </Button>
          </div>

          {!isConfigured && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-500">GROQ_API_KEY not configured</p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardHeader>

        {/* Messages - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 mb-4">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Hi! I&apos;m BrainBox</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Your AI assistant{webSearchAvailable ? ' with live web search' : ''}.
              </p>
              {webSearchAvailable && (
                <div className="flex items-center gap-2 text-sm text-green-600 mb-4">
                  <Globe className="w-4 h-4" />
                  <span>Web search enabled</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                {['Interview tips', 'Project ideas', 'Skills to learn'].map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-sm h-10 px-4 rounded-xl"
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[95%] lg:max-w-[85%] rounded-2xl px-4 py-3',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    {context.enableWebSearch && webSearchAvailable && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Searching...
                      </span>
                    )}
                  </div>
                </div>
              )}
              {lastSearchUsed && messages.length > 0 && !isLoading && (
                <div className="flex items-center gap-2 text-xs text-green-600 ml-11">
                  <Globe className="w-3 h-3" />
                  <span>Response used live web data</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input - Fixed at bottom */}
        <CardContent className="flex-shrink-0 border-t p-3 lg:p-4">
          {voiceError && (
            <div className="mb-3 px-3 py-2 bg-destructive/10 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{voiceError}</p>
            </div>
          )}
          <div className="flex gap-2 lg:gap-3 items-end">
            <div className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? 'Recording...' : 'Type a message...'}
                className="min-h-[44px] lg:min-h-[48px] max-h-[120px] resize-none text-base rounded-xl"
                style={{ fontSize: '16px' }} // Prevents iOS zoom on focus
                rows={1}
                disabled={isLoading || isRecording || !isConfigured}
              />
            </div>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleRecording}
              disabled={isTranscribing || isLoading || !isConfigured}
              className={cn('flex-shrink-0 h-11 w-11 rounded-xl', isRecording && 'animate-pulse')}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isRecording || !isConfigured}
              className="flex-shrink-0 h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


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
  const [showSidebar, setShowSidebar] = useState(true)
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-10rem)] sm:h-[calc(100vh-12rem)] min-h-[400px] max-h-[800px] gap-2 lg:gap-4">
      {/* Sidebar - Conversation List - Hidden on mobile by default */}
      {showSidebar && (
        <Card className="w-full lg:w-56 xl:w-64 flex-shrink-0 flex flex-col max-h-[200px] lg:max-h-none">
          <CardHeader className="py-2 lg:py-3 px-3 lg:px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs lg:text-sm font-medium">History</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-7 lg:w-7" onClick={createNewConversation}>
                  <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 lg:hidden" onClick={() => setShowSidebar(false)}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-1.5 lg:p-2">
            {conversations.length === 0 ? (
              <p className="text-[10px] lg:text-xs text-muted-foreground text-center py-2 lg:py-4">No conversations yet</p>
            ) : (
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'group flex items-center gap-1.5 lg:gap-2 p-1.5 lg:p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors flex-shrink-0 lg:flex-shrink',
                      currentConversationId === conv.id && 'bg-muted'
                    )}
                    onClick={() => setCurrentConversationId(conv.id)}
                  >
                    <MessageSquare className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-[10px] lg:text-sm truncate max-w-[100px] lg:max-w-none">{conv.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 lg:h-6 lg:w-6 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conv.id)
                      }}
                    >
                      <Trash2 className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-destructive" />
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
        <CardHeader className="flex-shrink-0 py-2 lg:py-3 px-2 sm:px-3 lg:px-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 lg:gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 lg:h-8 lg:w-8 flex-shrink-0"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
              </Button>
              <div className="p-1 lg:p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex-shrink-0">
                <Brain className="w-3 h-3 lg:w-4 lg:h-4 text-amber-500" />
              </div>
              <span className="font-semibold text-sm lg:text-base truncate">BrainBox</span>
              <Badge variant="outline" className="text-[8px] lg:text-[10px] bg-orange-500/10 text-orange-500 border-orange-500/20 flex-shrink-0 hidden sm:flex">
                Groq
              </Badge>
              {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-0.5 lg:gap-1 flex-shrink-0">
              {webSearchAvailable && (
                <Button
                  variant={context.enableWebSearch ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-6 lg:h-7 text-[10px] lg:text-xs px-1.5 lg:px-2",
                    context.enableWebSearch && "bg-green-500/20 hover:bg-green-500/30 text-green-600"
                  )}
                  onClick={() => setContext(prev => ({ ...prev, enableWebSearch: !prev.enableWebSearch }))}
                  title="Web search for current information"
                >
                  <Globe className="w-3 h-3" />
                  <span className="hidden lg:inline ml-1">Web</span>
                </Button>
              )}
              <Button
                variant={context.includeGoals ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 lg:h-7 text-[10px] lg:text-xs px-1.5 lg:px-2"
                onClick={() => setContext(prev => ({ ...prev, includeGoals: !prev.includeGoals }))}
              >
                <Target className="w-3 h-3" />
                <span className="hidden lg:inline ml-1">Goals</span>
              </Button>
              <Button
                variant={context.includeNotes ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 lg:h-7 text-[10px] lg:text-xs px-1.5 lg:px-2"
                onClick={() => setContext(prev => ({ ...prev, includeNotes: !prev.includeNotes }))}
              >
                <FileText className="w-3 h-3" />
                <span className="hidden lg:inline ml-1">Notes</span>
              </Button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 lg:h-7 px-1.5 lg:px-2" onClick={createNewConversation}>
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden lg:inline ml-1">New</span>
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
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-2">
              <div className="p-3 lg:p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 mb-3 lg:mb-4">
                <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-amber-500" />
              </div>
              <h3 className="font-semibold text-sm lg:text-base mb-1 lg:mb-2">Hi! I&apos;m BrainBox</h3>
              <p className="text-xs lg:text-sm text-muted-foreground max-w-sm mb-3 lg:mb-4">
                Your AI assistant{webSearchAvailable ? ' with live web search' : ''}.
              </p>
              {webSearchAvailable && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 mb-3">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web search enabled</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 lg:gap-2 justify-center">
                {['Interview tips', 'Project ideas', 'Skills to learn'].map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-[10px] lg:text-xs h-7 lg:h-8 px-2 lg:px-3"
                    onClick={() => setInput(s)}
                    disabled={!isConfigured}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 lg:space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2 lg:gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                      <Brain className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-amber-500" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-2.5 py-1.5 lg:px-3 lg:py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-xs lg:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="text-[8px] lg:text-[10px] opacity-50 mt-0.5 lg:mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 lg:gap-3">
                  <div className="flex-shrink-0 w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                    <Brain className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-amber-500" />
                  </div>
                  <div className="bg-muted rounded-2xl px-2.5 py-1.5 lg:px-3 lg:py-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 animate-spin text-amber-500" />
                    {context.enableWebSearch && webSearchAvailable && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        Searching...
                      </span>
                    )}
                  </div>
                </div>
              )}
              {lastSearchUsed && messages.length > 0 && !isLoading && (
                <div className="flex items-center gap-1.5 text-[10px] text-green-600 ml-9">
                  <Globe className="w-2.5 h-2.5" />
                  <span>Response used live web data</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input - Fixed at bottom */}
        <CardContent className="flex-shrink-0 border-t p-2 lg:p-3">
          {voiceError && (
            <div className="mb-2 px-2 py-1.5 bg-destructive/10 rounded-md flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">{voiceError}</p>
            </div>
          )}
          <div className="flex gap-1.5 lg:gap-2 items-end">
            <div className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? 'Recording...' : 'Message...'}
                className="min-h-[36px] lg:min-h-[40px] max-h-[100px] lg:max-h-[120px] resize-none text-xs lg:text-sm"
                rows={1}
                disabled={isLoading || isRecording || !isConfigured}
              />
            </div>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleRecording}
              disabled={isTranscribing || isLoading || !isConfigured}
              className={cn('flex-shrink-0 h-9 w-9 lg:h-10 lg:w-10', isRecording && 'animate-pulse')}
            >
              {isRecording ? <Square className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <Mic className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
            </Button>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isRecording || !isConfigured}
              className="flex-shrink-0 h-9 lg:h-10 px-3 lg:px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

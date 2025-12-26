'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Brain,
  Send,
  Loader2,
  Mic,
  Square,
  User,
  AlertCircle,
  Globe,
  History,
  Plus,
  Trash2,
  MessageSquare,
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
  const [historyOpen, setHistoryOpen] = useState(false)
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  // Load conversation messages when switching
  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find(c => c.id === currentConversationId)
      if (conv) {
        setMessages(conv.messages || [])
      }
    }
  }, [currentConversationId, conversations])

  const createNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
    setError(null)
    setHistoryOpen(false)
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

  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header with History button */}
      <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20">
            <Brain className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="font-bold text-lg">BrainBox</h1>
            {webSearchAvailable && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Globe className="w-3 h-3" />
                <span>Web search on</span>
              </div>
            )}
          </div>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={createNewConversation}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setHistoryOpen(true)}>
            <History className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="p-5 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 mb-6">
                <Brain className="w-12 h-12 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">How can I help?</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Ask me anything. I can search the web for current information.
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
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-amber-500" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-5 py-4',
                      message.role === 'user'
                        ? 'bg-amber-500 text-black'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-black" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="bg-muted rounded-2xl px-5 py-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                    <span className="text-muted-foreground">
                      {webSearchAvailable ? 'Searching & thinking...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              )}
              {lastSearchUsed && messages.length > 0 && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-green-600 ml-14">
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
        <div className="max-w-4xl mx-auto px-4 py-4">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {voiceError && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{voiceError}</p>
            </div>
          )}
          {!isConfigured && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-500">AI not configured. Please add GROQ_API_KEY.</p>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? 'Recording...' : 'Ask me anything...'}
                className="min-h-[56px] max-h-[150px] resize-none text-base rounded-2xl border-2 focus:border-amber-500"
                style={{ fontSize: '16px' }}
                rows={1}
                disabled={isLoading || isRecording || !isConfigured}
              />
            </div>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleRecording}
              disabled={isTranscribing || isLoading || !isConfigured}
              className={cn('h-14 w-14 rounded-2xl', isRecording && 'animate-pulse')}
            >
              {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isRecording || !isConfigured}
              className="h-14 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Conversation History</span>
              <Button variant="outline" size="sm" onClick={createNewConversation}>
                <Plus className="w-4 h-4 mr-1" />
                New Chat
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No conversations yet. Start chatting!
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted transition-colors',
                    currentConversationId === conv.id && 'bg-muted'
                  )}
                  onClick={() => {
                    setCurrentConversationId(conv.id)
                    setHistoryOpen(false)
                  }}
                >
                  <MessageSquare className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

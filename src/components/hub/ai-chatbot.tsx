'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
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
} from 'lucide-react'
import { useVoiceRecording } from '@/hooks/use-voice-recording'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatContext {
  includeGoals?: boolean
  includeNotes?: boolean
}

export function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [context, setContext] = useState<ChatContext>({
    includeGoals: true,
    includeNotes: false,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    setError(null)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
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
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
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

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  // Still checking configuration
  if (isConfigured === null) {
    return (
      <Card className="flex flex-col h-[600px] border-amber-500/20">
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[600px] border-amber-500/20">
      <CardHeader className="flex-shrink-0 pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20">
              <Brain className="w-5 h-5 text-amber-500" />
            </div>
            <span>BrainBox</span>
            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">
              Groq
            </Badge>
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Context toggles */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Include:</span>
          <Button
            variant={context.includeGoals ? 'secondary' : 'outline'}
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setContext(prev => ({ ...prev, includeGoals: !prev.includeGoals }))}
          >
            <Target className="w-3 h-3" />
            Goals
          </Button>
          <Button
            variant={context.includeNotes ? 'secondary' : 'outline'}
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setContext(prev => ({ ...prev, includeNotes: !prev.includeNotes }))}
          >
            <FileText className="w-3 h-3" />
            Notes
          </Button>
        </div>

        {/* Not configured warning */}
        {!isConfigured && (
          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
            <div className="text-xs text-amber-500">
              <p className="font-medium">AI not configured</p>
              <p className="opacity-80">GROQ_API_KEY needs to be added to environment variables.</p>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <span className="text-xs text-destructive">{error}</span>
          </div>
        )}
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 mb-4">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-semibold mb-2">Hi! I&apos;m BrainBox</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Your AI assistant powered by Groq. Ask me anything about career planning, tech, or productivity!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'Help me prepare for interviews',
                'Suggest project ideas',
                'What skills should I learn?',
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInput(suggestion)}
                  disabled={!isConfigured}
                >
                  {suggestion}
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
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-[10px] opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <CardContent className="flex-shrink-0 border-t p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Recording...' : 'Type a message...'}
              className="min-h-[44px] max-h-[150px] resize-none"
              rows={1}
              disabled={isLoading || isRecording || !isConfigured}
            />
          </div>
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            onClick={toggleRecording}
            disabled={isTranscribing || isLoading || !isConfigured}
            className={cn('flex-shrink-0 h-11 w-11', isRecording && 'animate-pulse')}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isRecording || !isConfigured}
            className="flex-shrink-0 h-11 bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {isRecording && (
          <p className="text-xs text-destructive mt-2 flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Recording... Click stop when done.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

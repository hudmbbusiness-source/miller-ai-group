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

  // Auto-scroll to bottom when new messages arrive
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

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, I could not generate a response.',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
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
  }

  return (
    <Card className="flex flex-col h-[600px] border-amber-500/20">
      <CardHeader className="flex-shrink-0 pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20">
              <Brain className="w-5 h-5 text-amber-500" />
            </div>
            <span>AI Assistant</span>
            <Badge variant="outline" className="text-xs font-normal">
              Powered by Groq
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        {/* Context toggles */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Include:</span>
          <Button
            variant={context.includeGoals ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setContext(prev => ({ ...prev, includeGoals: !prev.includeGoals }))}
          >
            <Target className="w-3 h-3" />
            Goals
          </Button>
          <Button
            variant={context.includeNotes ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setContext(prev => ({ ...prev, includeNotes: !prev.includeNotes }))}
          >
            <FileText className="w-3 h-3" />
            Notes
          </Button>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 mb-4">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-semibold mb-2">Hi! I&apos;m your AI Assistant</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              I can help with career planning, goal setting, technical questions, and more.
              Try asking about interview prep, project ideas, or industry trends!
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                'Help me prepare for tech interviews',
                'Suggest project ideas for my portfolio',
                'What skills should I learn next?',
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInput(suggestion)}
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

      {/* Input Area */}
      <CardContent className="flex-shrink-0 border-t p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Recording...' : 'Type a message or use voice...'}
              className="min-h-[44px] max-h-[150px] resize-none pr-12"
              rows={1}
              disabled={isLoading || isRecording}
            />
            {isTranscribing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              </div>
            )}
          </div>
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            onClick={toggleRecording}
            disabled={isTranscribing || isLoading}
            className={cn(
              'flex-shrink-0 h-11 w-11',
              isRecording && 'animate-pulse'
            )}
          >
            {isRecording ? (
              <Square className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isRecording}
            className="flex-shrink-0 h-11 bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {isRecording && (
          <p className="text-xs text-destructive mt-2 flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Recording... Click the stop button when done.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

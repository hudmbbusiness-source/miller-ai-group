'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Zap,
} from 'lucide-react'
import { useVoiceRecording } from '@/hooks/use-voice-recording'
import { cn } from '@/lib/utils'

type AIProvider = 'groq' | 'openai' | 'anthropic'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  provider?: AIProvider
  model?: string
}

interface ChatContext {
  includeGoals?: boolean
  includeNotes?: boolean
}

const providerLabels: Record<AIProvider, string> = {
  groq: 'Groq (Llama)',
  openai: 'ChatGPT',
  anthropic: 'Claude',
}

const providerColors: Record<AIProvider, string> = {
  groq: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  openai: 'bg-green-500/10 text-green-500 border-green-500/20',
  anthropic: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

export function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null)
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

  // Fetch available providers on mount
  useEffect(() => {
    fetch('/api/ai/chat')
      .then(res => res.json())
      .then(data => {
        if (data.providers && data.providers.length > 0) {
          setAvailableProviders(data.providers)
          setSelectedProvider(data.default || data.providers[0])
        }
      })
      .catch(err => {
        console.error('Failed to fetch providers:', err)
        setError('Failed to connect to AI service')
      })
  }, [])

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
          provider: selectedProvider,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Update available providers if returned
      if (data.availableProviders) {
        setAvailableProviders(data.availableProviders)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, I could not generate a response.',
        timestamp: new Date(),
        provider: data.provider,
        model: data.model,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Chat error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorMsg}`,
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
    setError(null)
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
          </CardTitle>
          <div className="flex items-center gap-2">
            {availableProviders.length > 0 && (
              <Select
                value={selectedProvider || undefined}
                onValueChange={(value) => setSelectedProvider(value as AIProvider)}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Select AI" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {providerLabels[provider]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {selectedProvider && (
            <Badge variant="outline" className={cn('text-xs', providerColors[selectedProvider])}>
              {providerLabels[selectedProvider]}
            </Badge>
          )}
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

        {/* Error display */}
        {error && (
          <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-destructive">{error}</span>
          </div>
        )}

        {/* No providers warning */}
        {availableProviders.length === 0 && !error && (
          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
            <div className="text-xs text-amber-500">
              <p className="font-medium">No AI providers configured</p>
              <p className="opacity-80">Add GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to enable AI chat.</p>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 mb-4">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-semibold mb-2">Hi! I&apos;m BrainBox</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your unified AI assistant connected to {availableProviders.length > 0
                ? availableProviders.map(p => providerLabels[p]).join(', ')
                : 'multiple AI providers'
              }. Ask me anything!
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
                  disabled={availableProviders.length === 0}
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
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] opacity-50">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {message.provider && (
                      <Badge variant="outline" className={cn('text-[9px] h-4', providerColors[message.provider])}>
                        {providerLabels[message.provider]}
                      </Badge>
                    )}
                  </div>
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
                    <span className="text-sm text-muted-foreground">
                      Thinking with {selectedProvider ? providerLabels[selectedProvider] : 'AI'}...
                    </span>
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
              disabled={isLoading || isRecording || availableProviders.length === 0}
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
            disabled={!input.trim() || isLoading || isRecording || availableProviders.length === 0}
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

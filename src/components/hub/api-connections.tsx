'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Database,
  Bot,
  Cloud,
  Video,
  Mail,
  CreditCard,
  Globe,
  Code,
  Zap,
  RefreshCw,
  Loader2,
} from 'lucide-react'

interface APIConnection {
  name: string
  description: string
  icon: React.ReactNode
  status: 'connected' | 'not_configured' | 'error'
  envKey: string
  docsUrl?: string
  category: 'ai' | 'database' | 'auth' | 'media' | 'payments' | 'hosting' | 'other'
}

// Static info about each service (icons, descriptions, docs)
const serviceInfo: Record<string, { description: string; icon: React.ReactNode; docsUrl: string }> = {
  'Groq AI': {
    description: 'Fast LLM inference for AI insights',
    icon: <Bot className="w-5 h-5" />,
    docsUrl: 'https://console.groq.com/docs',
  },
  'Google Gemini': {
    description: 'Google AI for multimodal capabilities',
    icon: <Bot className="w-5 h-5" />,
    docsUrl: 'https://ai.google.dev/docs',
  },
  'Replicate': {
    description: 'AI model hosting and inference',
    icon: <Zap className="w-5 h-5" />,
    docsUrl: 'https://replicate.com/docs',
  },
  'Supabase': {
    description: 'PostgreSQL database and authentication',
    icon: <Database className="w-5 h-5" />,
    docsUrl: 'https://supabase.com/docs',
  },
  'Google OAuth': {
    description: 'Sign in with Google authentication',
    icon: <Globe className="w-5 h-5" />,
    docsUrl: 'https://console.cloud.google.com',
  },
  'YouTube Data API': {
    description: 'Access YouTube channel and video data',
    icon: <Video className="w-5 h-5" />,
    docsUrl: 'https://developers.google.com/youtube',
  },
  'Resend': {
    description: 'Transactional email service',
    icon: <Mail className="w-5 h-5" />,
    docsUrl: 'https://resend.com/docs',
  },
  'Stripe': {
    description: 'Payment processing and subscriptions',
    icon: <CreditCard className="w-5 h-5" />,
    docsUrl: 'https://stripe.com/docs',
  },
  'Vercel': {
    description: 'Deployment and hosting platform',
    icon: <Cloud className="w-5 h-5" />,
    docsUrl: 'https://vercel.com/docs',
  },
  'GitHub': {
    description: 'Source control and CI/CD',
    icon: <Code className="w-5 h-5" />,
    docsUrl: 'https://docs.github.com',
  },
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  ai: { label: 'AI / ML', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  database: { label: 'Database', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  auth: { label: 'Auth', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  media: { label: 'Media', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  payments: { label: 'Payments', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  hosting: { label: 'Hosting', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  other: { label: 'Other', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

function ConnectionCard({ connection }: { connection: APIConnection }) {
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const maskedKey = '••••••••••••••••••••••••••••••••'
  const category = categoryLabels[connection.category]

  const handleCopy = () => {
    navigator.clipboard.writeText(connection.envKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {connection.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{connection.name}</h4>
              <Badge
                variant="outline"
                className={`text-xs ${
                  connection.status === 'connected'
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : connection.status === 'error'
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}
              >
                {connection.status === 'connected' ? 'Connected' : connection.status === 'error' ? 'Error' : 'Not Set'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {connection.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`text-xs ${category.color}`}>
                {category.label}
              </Badge>
              {connection.docsUrl && (
                <a
                  href={connection.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
                >
                  Docs <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div className="mt-3">
        <Input
          value={showKey ? connection.envKey : maskedKey}
          readOnly
          className="font-mono text-xs bg-background"
        />
      </div>
    </div>
  )
}

export function APIConnections() {
  const [connections, setConnections] = useState<APIConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const categories = ['ai', 'database', 'auth', 'media', 'payments', 'hosting', 'other']

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/system/status')
      if (!response.ok) throw new Error('Failed to fetch status')

      const data = await response.json()

      // Merge server status with static info
      const mergedConnections: APIConnection[] = data.services.map((service: { name: string; status: 'connected' | 'not_configured' | 'error'; envKey: string; category: 'ai' | 'database' | 'auth' | 'media' | 'payments' | 'hosting' | 'other' }) => ({
        ...service,
        description: serviceInfo[service.name]?.description || '',
        icon: serviceInfo[service.name]?.icon || <Code className="w-5 h-5" />,
        docsUrl: serviceInfo[service.name]?.docsUrl || '',
      }))

      setConnections(mergedConnections)
    } catch (err) {
      setError('Failed to fetch API status')
      console.error('Status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchStatus} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Connections
              </CardTitle>
              <CardDescription>
                Real-time status of your integrations
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-2xl font-bold text-green-500">
                {connections.filter(c => c.status === 'connected').length}
              </p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-2xl font-bold text-yellow-500">
                {connections.filter(c => c.status === 'not_configured').length}
              </p>
              <p className="text-xs text-muted-foreground">Not Set</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-2xl font-bold text-purple-500">
                {connections.filter(c => c.category === 'ai').length}
              </p>
              <p className="text-xs text-muted-foreground">AI Services</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-2xl font-bold text-orange-500">
                {connections.length}
              </p>
              <p className="text-xs text-muted-foreground">Total APIs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connections by Category */}
      {categories.map(category => {
        const categoryConnections = connections.filter(c => c.category === category)
        if (categoryConnections.length === 0) return null

        const catInfo = categoryLabels[category]

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline" className={catInfo.color}>
                  {catInfo.label}
                </Badge>
                <span className="text-muted-foreground text-sm font-normal">
                  ({categoryConnections.filter(c => c.status === 'connected').length}/{categoryConnections.length} connected)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryConnections.map(connection => (
                  <ConnectionCard key={connection.name} connection={connection} />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, CheckCircle, Circle, AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const readinessChecklist = [
  { id: 'api', label: 'API Integration Configured', status: 'pending' },
  { id: 'auth', label: 'Authentication Hooks Setup', status: 'pending' },
  { id: 'db', label: 'Database Schema Ready', status: 'ready' },
  { id: 'ui', label: 'UI Components Built', status: 'pending' },
  { id: 'webhook', label: 'Webhook Endpoints Active', status: 'pending' },
]

export default function KachowToolPage() {
  const readyCount = readinessChecklist.filter(i => i.status === 'ready').length
  const totalCount = readinessChecklist.length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-yellow-500/10">
          <Zap className="w-8 h-8 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Kachow AI</h1>
          <p className="text-muted-foreground">AI-powered productivity suite</p>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="border-2 border-gray-500/30 bg-gray-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-gray-500" />
              <CardTitle>Engine Not Connected</CardTitle>
            </div>
            <Badge variant="secondary">Offline</Badge>
          </div>
          <CardDescription>
            This engine is not yet connected to the Miller AI Group hub. Once connected, you&apos;ll be able to manage and monitor Kachow AI from here.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Readiness Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Readiness</CardTitle>
          <CardDescription>
            {readyCount} of {totalCount} prerequisites completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {readinessChecklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                {item.status === 'ready' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={item.status === 'ready' ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-3">
              To connect Kachow AI, the engine must be deployed and configured with the correct API keys and webhook endpoints.
            </p>
            <Button variant="outline" disabled className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Connection Guide (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/app/projects/kachow">View Project Details</Link>
          </Button>
          <Button variant="outline" disabled>
            View Logs
          </Button>
          <Button variant="outline" disabled>
            Configure Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

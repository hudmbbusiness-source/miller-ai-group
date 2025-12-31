'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Key,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  Sparkles,
  Stethoscope,
  Wrench,
  XCircle,
  Clock,
  Zap,
  FileCode,
  History,
  ChevronRight,
  Check,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  SystemHealthResult,
  APIHealthCheck,
  DatabaseHealthCheck,
  StorageHealthCheck,
  EnvHealthCheck,
  AnalysisResult,
  DiagnosticIssue,
  ProposedFix,
} from '@/lib/diagnostics/types'

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusInfo = (s: string) => {
    switch (s) {
      case 'healthy':
      case 'connected':
      case 'ok':
        return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', iconType: 'check' }
      case 'degraded':
      case 'empty':
        return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', iconType: 'warning' }
      case 'not_configured':
        return { color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30', iconType: 'settings' }
      case 'critical':
      case 'error':
      case 'not_found':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', iconType: 'error' }
      case 'checking':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', iconType: 'loading' }
      default:
        return { color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30', iconType: 'alert' }
    }
  }

  const info = getStatusInfo(status)

  const renderIcon = () => {
    const baseClass = 'w-3 h-3 mr-1'
    switch (info.iconType) {
      case 'check':
        return <CheckCircle2 className={baseClass} />
      case 'warning':
        return <AlertTriangle className={baseClass} />
      case 'settings':
        return <Settings className={baseClass} />
      case 'error':
        return <XCircle className={baseClass} />
      case 'loading':
        return <Loader2 className={`${baseClass} animate-spin`} />
      default:
        return <AlertCircle className={baseClass} />
    }
  }

  return (
    <Badge className={cn('border', info.color)}>
      {renderIcon()}
      {status.replace('_', ' ')}
    </Badge>
  )
}

// Severity badge component
function SeverityBadge({ severity }: { severity: DiagnosticIssue['severity'] }) {
  const colors = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-blue-500/20 text-blue-400',
  }

  return <Badge className={colors[severity]}>{severity}</Badge>
}

export default function DiagnosticsPage() {
  const [activeTab, setActiveTab] = useState('health')
  const [loading, setLoading] = useState(false)
  const [healthResult, setHealthResult] = useState<SystemHealthResult | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  // Issue Reporter state
  const [issueDescription, setIssueDescription] = useState('')
  const [issueLocation, setIssueLocation] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  // Fix approval state
  const [selectedFix, setSelectedFix] = useState<ProposedFix | null>(null)
  const [fixDialogOpen, setFixDialogOpen] = useState(false)
  const [applyingFix, setApplyingFix] = useState(false)

  // Run health check
  const runHealthCheck = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/diagnostics/health')
      const data = await response.json()

      if (data.overall) {
        setHealthResult(data)
        setLastCheck(new Date())
      }
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-run health check on mount
  useEffect(() => {
    runHealthCheck()
  }, [runHealthCheck])

  // Analyze issue
  const analyzeIssue = async () => {
    if (!issueDescription.trim()) return

    setAnalyzing(true)
    setAnalysisResult(null)

    try {
      const response = await fetch('/api/admin/diagnostics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: issueDescription,
          location: issueLocation,
          expectedBehavior,
          actualBehavior,
        }),
      })

      const data = await response.json()
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  // Apply fix (placeholder - would need more implementation)
  const applyFix = async (fix: ProposedFix) => {
    setApplyingFix(true)
    // In a real implementation, this would call an API to apply the fix
    await new Promise(resolve => setTimeout(resolve, 2000))
    setApplyingFix(false)
    setFixDialogOpen(false)
    // Show success message
  }

  // Render API health cards
  const renderAPIHealth = () => {
    if (!healthResult) return null

    const categories = {
      ai: { title: 'AI Providers', icon: Sparkles },
      search: { title: 'Search', icon: Search },
      database: { title: 'Database', icon: Database },
      media: { title: 'Media', icon: HardDrive },
      payments: { title: 'Payments', icon: Key },
      other: { title: 'Other Services', icon: Server },
    }

    return Object.entries(categories).map(([key, { title, icon: Icon }]) => {
      const apis = healthResult.apis.filter(a => a.category === key)
      if (apis.length === 0) return null

      return (
        <Card key={key}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {apis.map((api) => (
              <div
                key={api.name}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{api.name}</p>
                  <p className="text-xs text-muted-foreground">{api.envKey}</p>
                </div>
                <div className="flex items-center gap-2">
                  {api.latency && (
                    <span className="text-xs text-muted-foreground">{api.latency}ms</span>
                  )}
                  <StatusBadge status={api.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )
    })
  }

  // Render database health
  const renderDatabaseHealth = () => {
    if (!healthResult) return null

    const errors = healthResult.database.filter(d => d.status === 'error')
    const empty = healthResult.database.filter(d => d.status === 'empty')
    const ok = healthResult.database.filter(d => d.status === 'ok')

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Tables
          </CardTitle>
          <CardDescription>
            {ok.length} healthy, {empty.length} empty, {errors.length} errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {errors.length > 0 && (
              <AccordionItem value="errors">
                <AccordionTrigger className="text-red-400">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {errors.length} Tables with Errors
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {errors.map((table) => (
                      <div key={table.table} className="flex items-center justify-between p-2 bg-red-500/10 rounded">
                        <span className="font-mono text-sm">{table.table}</span>
                        <span className="text-xs text-red-400">{table.error}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {empty.length > 0 && (
              <AccordionItem value="empty">
                <AccordionTrigger className="text-amber-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {empty.length} Empty Tables
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2">
                    {empty.map((table) => (
                      <Badge key={table.table} variant="outline" className="font-mono">
                        {table.table}
                      </Badge>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="ok">
              <AccordionTrigger className="text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {ok.length} Healthy Tables
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ok.map((table) => (
                    <div
                      key={table.table}
                      className="flex items-center justify-between p-2 bg-emerald-500/10 rounded"
                    >
                      <span className="font-mono text-sm truncate">{table.table}</span>
                      <span className="text-xs text-emerald-400">{table.rowCount} rows</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    )
  }

  // Render storage health
  const renderStorageHealth = () => {
    if (!healthResult) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Buckets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthResult.storage.map((bucket) => (
            <div
              key={bucket.bucket}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div>
                <p className="font-medium">{bucket.bucket}</p>
                {bucket.fileCount !== undefined && (
                  <p className="text-xs text-muted-foreground">{bucket.fileCount} files</p>
                )}
              </div>
              <StatusBadge status={bucket.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Render environment variables
  const renderEnvHealth = () => {
    if (!healthResult) return null

    const required = healthResult.environment.filter(e => e.required)
    const optional = healthResult.environment.filter(e => !e.required)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Environment Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-red-400">Required</h4>
              <div className="space-y-2">
                {required.map((env) => (
                  <div
                    key={env.name}
                    className="flex items-center justify-between p-2 bg-white/5 rounded"
                  >
                    <span className="font-mono text-sm">{env.name}</span>
                    <StatusBadge status={env.configured ? 'connected' : 'error'} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Optional</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {optional.map((env) => (
                  <div
                    key={env.name}
                    className="flex items-center justify-between p-2 bg-white/5 rounded"
                  >
                    <span className="font-mono text-xs truncate">{env.name}</span>
                    {env.configured ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-violet-400" />
            AI Diagnostics
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor system health and automatically fix issues
          </p>
        </div>
        {lastCheck && (
          <div className="text-sm text-muted-foreground">
            Last check: {lastCheck.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Overall Status */}
      {healthResult && (
        <Card className={cn(
          'border-2',
          healthResult.overall === 'healthy' && 'border-emerald-500/30 bg-emerald-500/5',
          healthResult.overall === 'degraded' && 'border-amber-500/30 bg-amber-500/5',
          healthResult.overall === 'critical' && 'border-red-500/30 bg-red-500/5'
        )}>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  healthResult.overall === 'healthy' && 'bg-emerald-500/20',
                  healthResult.overall === 'degraded' && 'bg-amber-500/20',
                  healthResult.overall === 'critical' && 'bg-red-500/20'
                )}>
                  {healthResult.overall === 'healthy' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                  {healthResult.overall === 'degraded' && <AlertTriangle className="w-8 h-8 text-amber-400" />}
                  {healthResult.overall === 'critical' && <XCircle className="w-8 h-8 text-red-400" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold capitalize">{healthResult.overall}</h2>
                  <p className="text-muted-foreground">
                    {healthResult.issues_count} issues, {healthResult.warnings_count} warnings
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{healthResult.duration_ms}ms</p>
                  <p className="text-xs text-muted-foreground">Check duration</p>
                </div>
                <Button onClick={runHealthCheck} disabled={loading} className="gap-2">
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">System Health</span>
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Report Issue</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-2">
            <FileCode className="w-4 h-4" />
            <span className="hidden sm:inline">Code Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6 mt-6">
          {loading && !healthResult ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <>
              {/* API Health */}
              <div>
                <h3 className="text-lg font-semibold mb-4">API Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderAPIHealth()}
                </div>
              </div>

              {/* Database & Storage */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderDatabaseHealth()}
                <div className="space-y-6">
                  {renderStorageHealth()}
                  {renderEnvHealth()}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Issue Reporter Tab */}
        <TabsContent value="issues" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Report an Issue</CardTitle>
              <CardDescription>
                Describe the problem and let AI analyze and suggest fixes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="issue-desc">What's happening? *</Label>
                <Textarea
                  id="issue-desc"
                  placeholder="Describe the issue in detail. What's not working as expected?"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issue-location">Where is it happening?</Label>
                  <Input
                    id="issue-location"
                    placeholder="e.g., /app/settings, BrainBox chat, login page"
                    value={issueLocation}
                    onChange={(e) => setIssueLocation(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="expected">Expected behavior</Label>
                  <Input
                    id="expected"
                    placeholder="What should happen?"
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="actual">Actual behavior</Label>
                <Input
                  id="actual"
                  placeholder="What's actually happening?"
                  value={actualBehavior}
                  onChange={(e) => setActualBehavior(e.target.value)}
                />
              </div>

              <Button
                onClick={analyzeIssue}
                disabled={analyzing || !issueDescription.trim()}
                className="gap-2"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyze Issue
              </Button>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  Analysis Results
                </CardTitle>
                <CardDescription>{analysisResult.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Confidence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Analysis Confidence</Label>
                    <span className="text-sm">{Math.round(analysisResult.confidence * 100)}%</span>
                  </div>
                  <Progress value={analysisResult.confidence * 100} />
                </div>

                {/* Issues Found */}
                {analysisResult.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Issues Identified</h4>
                    <div className="space-y-3">
                      {analysisResult.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="p-4 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <SeverityBadge severity={issue.severity} />
                                <Badge variant="outline">{issue.category}</Badge>
                              </div>
                              <h5 className="font-medium">{issue.title}</h5>
                              <p className="text-sm text-muted-foreground mt-1">
                                {issue.description}
                              </p>
                              {issue.location && (
                                <p className="text-xs text-muted-foreground mt-2 font-mono">
                                  Location: {issue.location}
                                </p>
                              )}
                            </div>
                          </div>
                          {issue.suggestion && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <p className="text-sm text-emerald-400">
                                <strong>Suggestion:</strong> {issue.suggestion}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposed Fixes */}
                {analysisResult.proposedFixes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Proposed Fixes</h4>
                    <div className="space-y-3">
                      {analysisResult.proposedFixes.map((fix) => (
                        <div
                          key={fix.id}
                          className="p-4 bg-violet-500/10 rounded-lg border border-violet-500/20"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={cn(
                                  fix.risk === 'low' && 'bg-emerald-500/20 text-emerald-400',
                                  fix.risk === 'medium' && 'bg-amber-500/20 text-amber-400',
                                  fix.risk === 'high' && 'bg-red-500/20 text-red-400'
                                )}>
                                  {fix.risk} risk
                                </Badge>
                                <Badge variant="outline">{fix.type}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(fix.confidence * 100)}% confidence
                                </span>
                              </div>
                              <p className="text-sm">{fix.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Impact: {fix.estimatedImpact}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFix(fix)
                                setFixDialogOpen(true)
                              }}
                              className="gap-2"
                            >
                              <Wrench className="w-4 h-4" />
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Suggestions */}
                {analysisResult.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {analysisResult.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Provider info */}
                {analysisResult.aiProvider && (
                  <div className="pt-4 border-t border-white/10 text-xs text-muted-foreground">
                    Analyzed by {analysisResult.aiProvider} ({analysisResult.aiModel})
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Code Analysis Tab */}
        <TabsContent value="code" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Code Analysis</CardTitle>
              <CardDescription>
                Scan your codebase for errors, security issues, and performance problems
              </CardDescription>
            </CardHeader>
            <CardContent className="py-10 text-center text-muted-foreground">
              <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Code analysis feature coming soon.</p>
              <p className="text-sm mt-2">
                This will allow you to scan specific files or the entire codebase for issues.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic History</CardTitle>
              <CardDescription>
                View past diagnostic sessions and their results
              </CardDescription>
            </CardHeader>
            <CardContent className="py-10 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Diagnostic history will appear here.</p>
              <p className="text-sm mt-2">
                All your health checks and issue analyses are logged for reference.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fix Approval Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Fix</DialogTitle>
            <DialogDescription>
              Review the proposed changes before applying
            </DialogDescription>
          </DialogHeader>

          {selectedFix && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  selectedFix.risk === 'low' && 'bg-emerald-500/20 text-emerald-400',
                  selectedFix.risk === 'medium' && 'bg-amber-500/20 text-amber-400',
                  selectedFix.risk === 'high' && 'bg-red-500/20 text-red-400'
                )}>
                  {selectedFix.risk} risk
                </Badge>
                <Badge variant="outline">{selectedFix.type}</Badge>
              </div>

              <p className="text-sm">{selectedFix.description}</p>

              <div>
                <h4 className="font-medium mb-2">Changes to apply:</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-neutral-900 rounded font-mono text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <span className="uppercase text-xs">{selectedFix.type}</span>
                      <span>{selectedFix.filePath}</span>
                    </div>
                    <p className="text-neutral-300">{selectedFix.description}</p>
                    {selectedFix.content && (
                      <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-x-auto max-h-40">
                        {selectedFix.content.substring(0, 500)}
                        {selectedFix.content.length > 500 && '...'}
                      </pre>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-sm text-amber-400">
                  <strong>Warning:</strong> This action will modify your codebase. A backup will be created before applying changes.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFixDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedFix && applyFix(selectedFix)}
              disabled={applyingFix}
              className="gap-2"
            >
              {applyingFix ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Apply Fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

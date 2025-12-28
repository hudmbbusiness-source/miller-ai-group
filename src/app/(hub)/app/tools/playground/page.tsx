'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Code2,
  Palette,
  Layout,
  BarChart3,
  Sparkles,
  Check,
  X,
  Eye,
  Copy,
  RefreshCw,
  Layers,
  Component,
  Zap,
  TrendingUp,
  Target,
  FileText,
  Grid3X3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Preview components for demonstration
const PreviewCard = ({ variant }: { variant: 'current' | 'proposed' }) => {
  const isCurrent = variant === 'current'
  return (
    <div className={cn(
      "p-4 rounded-xl border",
      isCurrent
        ? "bg-card border-border"
        : "bg-gradient-to-br from-neutral-900 to-neutral-950 border-violet-500/20"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "p-2 rounded-lg",
          isCurrent ? "bg-muted" : "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
        )}>
          <Target className={cn("w-4 h-4", isCurrent ? "text-muted-foreground" : "text-white")} />
        </div>
        <div>
          <h4 className="font-medium text-sm">Active Goal</h4>
          <p className="text-xs text-muted-foreground">Complete project milestone</p>
        </div>
      </div>
      <div className={cn(
        "h-2 rounded-full overflow-hidden",
        isCurrent ? "bg-muted" : "bg-neutral-800"
      )}>
        <motion.div
          className={cn(
            "h-full",
            isCurrent ? "bg-primary" : "bg-gradient-to-r from-violet-500 to-purple-500"
          )}
          initial={{ width: 0 }}
          animate={{ width: '65%' }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </div>
    </div>
  )
}

const PreviewStatCard = ({ variant }: { variant: 'current' | 'proposed' }) => {
  const isCurrent = variant === 'current'
  return (
    <div className={cn(
      "p-4 rounded-xl border",
      isCurrent
        ? "bg-card border-border"
        : "bg-gradient-to-br from-neutral-900/90 to-neutral-900/50 border-white/5 backdrop-blur-xl"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Notes</span>
        <div className={cn(
          "p-1.5 rounded-lg",
          isCurrent ? "bg-muted" : "bg-gradient-to-br from-violet-500 to-purple-600"
        )}>
          <FileText className={cn("w-3 h-3", isCurrent ? "text-muted-foreground" : "text-white")} />
        </div>
      </div>
      <motion.span
        className="text-2xl font-bold"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', delay: 0.3 }}
      >
        24
      </motion.span>
    </div>
  )
}

const PreviewChart = ({ variant }: { variant: 'current' | 'proposed' }) => {
  const isCurrent = variant === 'current'
  const bars = [40, 65, 45, 80, 55, 70, 90]

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      isCurrent
        ? "bg-card border-border"
        : "bg-gradient-to-br from-neutral-900 to-neutral-950 border-violet-500/10"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className={cn("w-4 h-4", isCurrent ? "text-muted-foreground" : "text-violet-400")} />
        <span className="text-sm font-medium">Weekly Activity</span>
      </div>
      <div className="flex items-end gap-1 h-20">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            className={cn(
              "flex-1 rounded-t",
              isCurrent
                ? "bg-primary/50"
                : "bg-gradient-to-t from-violet-600 to-purple-400"
            )}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>
    </div>
  )
}

const PreviewButton = ({ variant }: { variant: 'current' | 'proposed' }) => {
  const isCurrent = variant === 'current'
  return (
    <div className="flex flex-wrap gap-2">
      <button className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
        isCurrent
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
      )}>
        Primary
      </button>
      <button className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
        isCurrent
          ? "border-border bg-background hover:bg-muted"
          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30"
      )}>
        Secondary
      </button>
    </div>
  )
}

interface PendingChange {
  id: string
  title: string
  description: string
  component: 'card' | 'stat' | 'chart' | 'button' | 'layout'
  status: 'pending' | 'approved' | 'rejected'
  targetPage: string
}

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState('preview')
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([
    {
      id: '1',
      title: 'Goal Cards Redesign',
      description: 'Modern gradient cards with animated progress bars and glow effects',
      component: 'card',
      status: 'pending',
      targetPage: '/app/goals',
    },
    {
      id: '2',
      title: 'Stats Dashboard Upgrade',
      description: 'Animated counters with glassmorphism and gradient icons',
      component: 'stat',
      status: 'pending',
      targetPage: '/app (Dashboard)',
    },
    {
      id: '3',
      title: 'Activity Charts',
      description: 'Smooth animated bar charts with gradient fills',
      component: 'chart',
      status: 'pending',
      targetPage: '/app (Dashboard)',
    },
    {
      id: '4',
      title: 'Button Styles',
      description: 'Gradient primary buttons with shadow glow effects',
      component: 'button',
      status: 'pending',
      targetPage: 'Global',
    },
  ])

  const updateChangeStatus = (id: string, status: 'approved' | 'rejected') => {
    setPendingChanges(prev =>
      prev.map(change =>
        change.id === id ? { ...change, status } : change
      )
    )
  }

  const resetChanges = () => {
    setPendingChanges(prev =>
      prev.map(change => ({ ...change, status: 'pending' as const }))
    )
  }

  const getComponentPreview = (component: string, variant: 'current' | 'proposed') => {
    switch (component) {
      case 'card': return <PreviewCard variant={variant} />
      case 'stat': return <PreviewStatCard variant={variant} />
      case 'chart': return <PreviewChart variant={variant} />
      case 'button': return <PreviewButton variant={variant} />
      default: return null
    }
  }

  const approvedCount = pendingChanges.filter(c => c.status === 'approved').length
  const rejectedCount = pendingChanges.filter(c => c.status === 'rejected').length
  const pendingCount = pendingChanges.filter(c => c.status === 'pending').length

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.div
          className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Code2 className="w-8 h-8 text-white" />
        </motion.div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Code Playground
          </h1>
          <p className="text-muted-foreground">Preview and approve UI changes before implementation</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            <Check className="w-3 h-3 mr-1" />
            {approvedCount} Approved
          </Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
            <Eye className="w-3 h-3 mr-1" />
            {pendingCount} Pending
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="components" className="flex items-center gap-2">
            <Component className="w-4 h-4" />
            Components
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Pending ({pendingCount})
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Current Design */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <CardTitle className="text-lg">Current Design</CardTitle>
                </div>
                <CardDescription>How components look now</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PreviewCard variant="current" />
                <PreviewStatCard variant="current" />
                <PreviewChart variant="current" />
                <PreviewButton variant="current" />
              </CardContent>
            </Card>

            {/* Proposed Design */}
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-3 h-3 rounded-full bg-violet-500"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <CardTitle className="text-lg">Proposed Design</CardTitle>
                </div>
                <CardDescription>New modern UI with animations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PreviewCard variant="proposed" />
                <PreviewStatCard variant="proposed" />
                <PreviewChart variant="proposed" />
                <PreviewButton variant="proposed" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="mt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Cards', icon: Layout, count: 4 },
              { name: 'Charts', icon: BarChart3, count: 3 },
              { name: 'Buttons', icon: Zap, count: 6 },
              { name: 'Stats', icon: TrendingUp, count: 4 },
              { name: 'Forms', icon: FileText, count: 2 },
              { name: 'Grids', icon: Grid3X3, count: 2 },
            ].map((item) => (
              <motion.div
                key={item.name}
                whileHover={{ scale: 1.02, y: -2 }}
                className="p-4 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border hover:border-violet-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                    <item.icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">{item.count} variants</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Pending Changes Tab */}
        <TabsContent value="pending" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Pending UI Changes</h3>
            <Button variant="outline" size="sm" onClick={resetChanges}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {pendingChanges.map((change, index) => (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "transition-all duration-300",
                    change.status === 'approved' && "border-emerald-500/30 bg-emerald-500/5",
                    change.status === 'rejected' && "border-red-500/30 bg-red-500/5 opacity-50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Preview */}
                        <div className="w-48 flex-shrink-0">
                          {getComponentPreview(change.component, 'proposed')}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{change.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {change.targetPage}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {change.description}
                          </p>

                          {change.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                onClick={() => updateChangeStatus(change.id, 'approved')}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                onClick={() => updateChangeStatus(change.id, 'rejected')}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Copy className="w-4 h-4 mr-1" />
                                View Code
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                change.status === 'approved'
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                  : "bg-red-500/10 text-red-500 border-red-500/30"
                              )}
                            >
                              {change.status === 'approved' ? (
                                <><Check className="w-3 h-3 mr-1" /> Approved</>
                              ) : (
                                <><X className="w-3 h-3 mr-1" /> Rejected</>
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          {approvedCount > 0 && (
            <motion.div
              className="mt-6 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Ready to Implement</h4>
                  <p className="text-sm text-muted-foreground">
                    {approvedCount} change{approvedCount > 1 ? 's' : ''} approved and ready for deployment
                  </p>
                </div>
                <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Changes
                </Button>
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Card className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 border-white/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-400" />
            How This Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-violet-400 font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium">Preview</h4>
                <p className="text-muted-foreground text-xs">Compare current vs proposed UI side by side</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-violet-400 font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium">Approve/Reject</h4>
                <p className="text-muted-foreground text-xs">Give explicit approval before any changes</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-violet-400 font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium">Implement</h4>
                <p className="text-muted-foreground text-xs">Only approved changes get built and deployed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

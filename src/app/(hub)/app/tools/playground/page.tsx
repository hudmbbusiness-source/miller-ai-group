'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Code2,
  Eye,
  Play,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Tablet,
  RotateCcw,
  Maximize2,
  FileText,
  Target,
  BarChart3,
  TrendingUp,
  Grid3X3,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// LIVE PREVIEW COMPONENTS - These are REAL rendered components
// ============================================

// Current Goal Card (how it looks now)
function CurrentGoalCard() {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-muted">
          <Target className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h4 className="font-medium text-sm">Complete Q1 Goals</h4>
          <p className="text-xs text-muted-foreground">Due Jan 31</p>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary w-[65%]" />
      </div>
      <p className="text-xs text-muted-foreground mt-2">65% complete</p>
    </div>
  )
}

// Proposed Goal Card (new design)
function ProposedGoalCard() {
  return (
    <motion.div
      className="p-4 rounded-xl border border-violet-500/20 bg-gradient-to-br from-neutral-900 to-neutral-950"
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
          whileHover={{ rotate: 5 }}
        >
          <Target className="w-4 h-4 text-white" />
        </motion.div>
        <div>
          <h4 className="font-medium text-sm text-white">Complete Q1 Goals</h4>
          <p className="text-xs text-neutral-400">Due Jan 31</p>
        </div>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: '65%' }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-neutral-400 mt-2">65% complete</p>
    </motion.div>
  )
}

// Current Stat Card
function CurrentStatCard() {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Notes</span>
        <FileText className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">24</p>
    </div>
  )
}

// Proposed Stat Card
function ProposedStatCard() {
  return (
    <motion.div
      className="p-4 rounded-xl border border-white/5 bg-gradient-to-br from-neutral-900/90 to-neutral-900/50 backdrop-blur-xl"
      whileHover={{ scale: 1.02, y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">Notes</span>
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
          <FileText className="w-3 h-3 text-white" />
        </div>
      </div>
      <motion.p
        className="text-2xl font-bold text-white"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        24
      </motion.p>
    </motion.div>
  )
}

// Current Chart
function CurrentChart() {
  const data = [40, 65, 45, 80, 55, 70, 90]
  return (
    <div className="p-4 rounded-lg border bg-card">
      <p className="text-sm font-medium mb-3">Weekly Activity</p>
      <div className="flex items-end gap-1 h-24">
        {data.map((h, i) => (
          <div key={i} className="flex-1 bg-primary/50 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

// Proposed Chart
function ProposedChart() {
  const data = [40, 65, 45, 80, 55, 70, 90]
  return (
    <div className="p-4 rounded-xl border border-violet-500/10 bg-gradient-to-br from-neutral-900 to-neutral-950">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        <p className="text-sm font-medium text-white">Weekly Activity</p>
      </div>
      <div className="flex items-end gap-1 h-24">
        {data.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-gradient-to-t from-violet-600 to-purple-400 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-neutral-500">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  )
}

// Current Button
function CurrentButtons() {
  return (
    <div className="flex flex-wrap gap-2 p-4 rounded-lg border bg-card">
      <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
        Primary
      </button>
      <button className="px-4 py-2 rounded-lg border bg-background text-sm font-medium">
        Secondary
      </button>
      <button className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">
        Danger
      </button>
    </div>
  )
}

// Proposed Buttons
function ProposedButtons() {
  return (
    <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-white/5 bg-neutral-900">
      <motion.button
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-500/25"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Primary
      </motion.button>
      <motion.button
        className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium hover:bg-white/10"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Secondary
      </motion.button>
      <motion.button
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-medium shadow-lg shadow-red-500/25"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Danger
      </motion.button>
    </div>
  )
}

// Dashboard Preview - Current
function CurrentDashboard() {
  return (
    <div className="p-4 space-y-4 bg-background rounded-lg border min-h-[300px]">
      <h2 className="text-lg font-bold">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3">
        <CurrentStatCard />
        <CurrentStatCard />
      </div>
      <CurrentGoalCard />
      <CurrentChart />
    </div>
  )
}

// Dashboard Preview - Proposed
function ProposedDashboard() {
  return (
    <div className="p-4 space-y-4 bg-black rounded-xl border border-white/5 min-h-[300px]">
      <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
        Dashboard
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <ProposedStatCard />
        <ProposedStatCard />
      </div>
      <ProposedGoalCard />
      <ProposedChart />
    </div>
  )
}

// ============================================
// MAIN PLAYGROUND COMPONENT
// ============================================

type PreviewSize = 'mobile' | 'tablet' | 'desktop'
type ComponentType = 'goal-card' | 'stat-card' | 'chart' | 'buttons' | 'dashboard'

const componentOptions: { id: ComponentType; label: string; icon: typeof Target }[] = [
  { id: 'dashboard', label: 'Full Dashboard', icon: Grid3X3 },
  { id: 'goal-card', label: 'Goal Card', icon: Target },
  { id: 'stat-card', label: 'Stat Card', icon: TrendingUp },
  { id: 'chart', label: 'Chart', icon: BarChart3 },
  { id: 'buttons', label: 'Buttons', icon: Zap },
]

export default function PlaygroundPage() {
  const [activeComponent, setActiveComponent] = useState<ComponentType>('dashboard')
  const [previewSize, setPreviewSize] = useState<PreviewSize>('desktop')
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  const sizeClasses = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-full',
  }

  const renderCurrentComponent = () => {
    switch (activeComponent) {
      case 'goal-card': return <CurrentGoalCard />
      case 'stat-card': return <CurrentStatCard />
      case 'chart': return <CurrentChart />
      case 'buttons': return <CurrentButtons />
      case 'dashboard': return <CurrentDashboard />
    }
  }

  const renderProposedComponent = () => {
    switch (activeComponent) {
      case 'goal-card': return <ProposedGoalCard />
      case 'stat-card': return <ProposedStatCard />
      case 'chart': return <ProposedChart />
      case 'buttons': return <ProposedButtons />
      case 'dashboard': return <ProposedDashboard />
    }
  }

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Code2 className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Code Playground</h1>
            <p className="text-muted-foreground">Live preview - see exactly how UI will look</p>
          </div>
        </div>
      </div>

      {/* Component Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Component to Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {componentOptions.map((opt) => (
              <Button
                key={opt.id}
                variant={activeComponent === opt.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveComponent(opt.id)}
                className={cn(
                  activeComponent === opt.id && 'bg-violet-500 hover:bg-violet-600'
                )}
              >
                <opt.icon className="w-4 h-4 mr-2" />
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Preview Size:</span>
          <div className="flex gap-1">
            <Button
              variant={previewSize === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewSize('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            <Button
              variant={previewSize === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewSize('tablet')}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={previewSize === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewSize('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCode(!showCode)}>
            <Code2 className="w-4 h-4 mr-2" />
            {showCode ? 'Hide Code' : 'Show Code'}
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <h3 className="font-semibold">Current Design</h3>
          </div>
          <div className={cn(
            'border rounded-xl p-4 bg-background transition-all mx-auto',
            sizeClasses[previewSize]
          )}>
            {renderCurrentComponent()}
          </div>
        </div>

        {/* Proposed */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              className="w-3 h-3 rounded-full bg-violet-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <h3 className="font-semibold">Proposed Design</h3>
            <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/30">New</Badge>
          </div>
          <div className={cn(
            'border border-violet-500/20 rounded-xl p-4 bg-black transition-all mx-auto',
            sizeClasses[previewSize]
          )}>
            {renderProposedComponent()}
          </div>
        </div>
      </div>

      {/* Code View */}
      {showCode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Component Code</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-4 rounded-lg bg-neutral-950 text-neutral-300 text-sm overflow-x-auto">
                <code>{`// This is the actual code that will be implemented
// Component: ${activeComponent}

<motion.div
  className="p-4 rounded-xl border border-violet-500/20
             bg-gradient-to-br from-neutral-900 to-neutral-950"
  whileHover={{ scale: 1.02, y: -2 }}
>
  {/* Gradient icon */}
  <div className="p-2 rounded-xl bg-gradient-to-br
                  from-violet-500 to-purple-600
                  shadow-lg shadow-violet-500/25">
    <Icon className="w-4 h-4 text-white" />
  </div>

  {/* Animated progress bar */}
  <motion.div
    className="h-2 bg-gradient-to-r from-violet-500 to-purple-500"
    initial={{ width: 0 }}
    animate={{ width: '65%' }}
  />
</motion.div>`}</code>
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Approval Section */}
      <Card className="border-2 border-dashed border-violet-500/30">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Ready to Apply This Design?</h3>
              <p className="text-sm text-muted-foreground">
                Click approve to have me implement these changes to the actual pages
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                <Check className="w-4 h-4 mr-2" />
                Approve Design
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>How to use:</strong> Select a component above to see a live side-by-side comparison.
            The left shows the current design, the right shows the proposed upgrade.
            Use the size buttons to test responsive layouts. Click "Approve Design" when ready to implement.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

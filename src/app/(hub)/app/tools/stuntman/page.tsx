'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, ExternalLink, BarChart3, Cpu, Shield, Zap, Sparkles } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Cpu,
    title: 'Advanced AI Analytics',
    description: 'Machine learning models trained on historical crypto market data for pattern recognition',
  },
  {
    icon: Zap,
    title: 'Micro-Scalping Trades',
    description: 'High-frequency execution designed to capture small, consistent profits across many trades',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analysis',
    description: 'Live market data processing with sub-second decision making capabilities',
  },
  {
    icon: Shield,
    title: 'Risk Management',
    description: 'Built-in position limits, stop-losses, and portfolio protection mechanisms',
  },
]

export default function StuntmanToolPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/10">
          <TrendingUp className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">StuntMan AI</h1>
          <p className="text-muted-foreground">High-frequency micro-scalping crypto trading system</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-amber-500/10 text-amber-500 border-amber-500/30">
          In Development
        </Badge>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About StuntMan AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            StuntMan AI is a sophisticated high-frequency trading system exclusively targeting cryptocurrency markets.
            Built with advanced AI data analysis and precision-focused analytical strategies, StuntMan aims to execute
            micro-scalping trades with maximum accuracy.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-2 rounded-lg bg-emerald-500/10 h-fit">
                  <feature.icon className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Development Status */}
      <Card className="border-2 border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              <CardTitle>Currently In Development</CardTitle>
            </div>
          </div>
          <CardDescription>
            StuntMan AI is in active development. The high-frequency trading engine, AI models,
            exchange integrations, and risk management systems are being designed and tested
            before any live trading with real capital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Building a crypto trading system requires rigorous testing and backtesting before deployment.
            StuntMan focuses on micro-scalping strategies that require precise execution and robust risk controls.
          </p>
        </CardContent>
      </Card>

      {/* Target Markets */}
      <Card>
        <CardHeader>
          <CardTitle>Target Markets</CardTitle>
          <CardDescription>Cryptocurrency pairs and exchanges under consideration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">BTC/USDT</Badge>
            <Badge variant="outline">ETH/USDT</Badge>
            <Badge variant="outline">SOL/USDT</Badge>
            <Badge variant="outline">BNB/USDT</Badge>
            <Badge variant="outline">XRP/USDT</Badge>
            <Badge variant="outline">+ Major Altcoins</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Focus on high-liquidity pairs to ensure optimal execution and minimal slippage
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/app/projects/stuntman">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Project Details
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

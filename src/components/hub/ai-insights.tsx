'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  TrendingUp,
  Target,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'

interface CareerInsight {
  recommendation: string
  nextSteps: string[]
  marketTrends: string
  skillGaps: string[]
}

interface ProgressAnalysis {
  summary: string
  strengths: string[]
  areasToImprove: string[]
  predictedOutcome: string
  motivationalMessage: string
}

interface AIInsightsProps {
  completedItems: string[]
  pendingItems: string[]
  totalItems: number
  completedCount: number
  careerGoal?: string // User's career goal from database/settings
}

export function AIInsights({
  completedItems,
  pendingItems,
  totalItems,
  completedCount,
  careerGoal,
}: AIInsightsProps) {
  const [insights, setInsights] = useState<CareerInsight | null>(null)
  const [analysis, setAnalysis] = useState<ProgressAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchInsights = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch career insights (only if career goal is provided)
      const insightsRes = careerGoal ? await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'career-insights',
          data: {
            completedItems: completedItems.slice(0, 10),
            pendingItems: pendingItems.slice(0, 10),
            careerGoal, // Use prop from user's settings
          },
        }),
      }) : null

      // Fetch progress analysis
      const analysisRes = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'progress-analysis',
          data: {
            totalItems,
            completedCount,
            recentActivity: completedItems.slice(0, 5),
          },
        }),
      })

      if (insightsRes?.ok) {
        const insightsData = await insightsRes.json()
        setInsights(insightsData.insights)
      }

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json()
        setAnalysis(analysisData.analysis)
      }

      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to fetch AI insights. Please try again.')
      console.error('AI Insights Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!insights && !analysis && !loading) {
    return (
      <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Sparkles className="w-10 h-10 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-md">
            Get personalized career recommendations, progress analysis, and next steps based on your Zuckerberg Project progress.
          </p>
          <Button onClick={fetchInsights} disabled={loading}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          </div>
          <p className="text-muted-foreground mt-4">Analyzing your progress with AI...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-10 h-10 text-destructive mb-4" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchInsights} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress Analysis */}
      {analysis && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Progress Analysis
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {lastUpdated && (
              <CardDescription>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">{analysis.summary}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {analysis.strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 mt-1 text-green-500 shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-amber-500 mb-2 flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Areas to Improve
                </h4>
                <ul className="space-y-1">
                  {analysis.areasToImprove.map((area, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 mt-1 text-amber-500 shrink-0" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-sm">
                <span className="font-medium text-primary">Predicted Outcome:</span>{' '}
                <span className="text-muted-foreground">{analysis.predictedOutcome}</span>
              </p>
            </div>

            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-sm italic text-foreground">&ldquo;{analysis.motivationalMessage}&rdquo;</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Career Insights */}
      {insights && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Career Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Key Recommendation</h4>
              <p className="text-muted-foreground">{insights.recommendation}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Next Steps This Week</h4>
              <ul className="space-y-2">
                {insights.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0 mt-0.5">
                      {i + 1}
                    </Badge>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Market Trends</h4>
              <p className="text-sm text-muted-foreground">{insights.marketTrends}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Skill Gaps to Address</h4>
              <div className="flex flex-wrap gap-2">
                {insights.skillGaps.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, ExternalLink, Video, Sparkles, TrendingUp, Scissors, Instagram } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: TrendingUp,
    title: 'Algorithm-Driven Editing',
    description: 'Analyzes YouTube algorithm trends to identify what content performs best',
  },
  {
    icon: Scissors,
    title: 'Auto-Clip Generation',
    description: 'Automatically extracts viral-worthy moments from long-form content',
  },
  {
    icon: Sparkles,
    title: 'Smart Optimization',
    description: 'Optimizes clips for maximum engagement across social platforms',
  },
  {
    icon: Video,
    title: 'Multi-Platform Export',
    description: 'Export optimized content for YouTube Shorts, TikTok, and Instagram Reels',
  },
]

export default function KachowToolPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-yellow-500/10">
          <Zap className="w-8 h-8 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Kachow AI</h1>
          <p className="text-muted-foreground">AI auto-editing powered by algorithmic data</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
          In Development
        </Badge>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About Kachow AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Kachow AI is an advanced auto-editing platform that leverages real-time YouTube algorithmic data
            to identify viral moments in long-form content. The system automatically generates optimized
            short-form clips designed for maximum engagement and distribution across social platforms.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-2 rounded-lg bg-yellow-500/10 h-fit">
                  <feature.icon className="w-4 h-4 text-yellow-500" />
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
      <Card className="border-2 border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              <CardTitle>Currently In Development</CardTitle>
            </div>
          </div>
          <CardDescription>
            Kachow AI is being actively developed. The core AI editing engine, YouTube data integration,
            and export pipelines are under construction. Follow our progress on Instagram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="gap-2">
            <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
              <Instagram className="w-4 h-4" />
              Follow @kachowai
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Target Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Target Use Cases</CardTitle>
          <CardDescription>Who Kachow AI is designed for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">YouTube Creators</Badge>
            <Badge variant="outline">Podcast Editors</Badge>
            <Badge variant="outline">Content Agencies</Badge>
            <Badge variant="outline">Social Media Managers</Badge>
            <Badge variant="outline">Video Editors</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Designed to save hours of manual editing by automating clip selection and optimization
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
            <Link href="/app/projects/kachow">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Project Details
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.instagram.com/kachowai/" target="_blank" rel="noopener noreferrer">
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

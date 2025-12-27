'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  GraduationCap,
  Award,
  Briefcase,
  BookOpen,
  ExternalLink,
  Loader2,
  RefreshCw,
  Target,
  Clock,
  MapPin,
  Rocket,
  Building2,
  CheckCircle2,
  Zap,
  Youtube,
  FileText,
  Headphones,
  Star,
} from 'lucide-react'

interface CareerStageData {
  likelihood: string
  salary: string
  title: string
  requirements: string[]
  howToGetHere: string
  competitiveness: string
  byuSpecific: string
}

interface Job {
  title: string
  companies: string[]
  category: string
  applicationUrl: string
  interviewProcess: string
  careerProgression: {
    newGrad: CareerStageData
    twoToThreeYears: CareerStageData
    fiveToSevenYears: CareerStageData
    tenPlusYears: CareerStageData
  }
  // Personalized match data
  matchScore?: number
  matchReasons?: string[]
  matchGaps?: string[]
}

interface Certification {
  name: string
  provider: string
  cost: number
  duration: string
  url: string
  salaryBoost: number
  companies: string[]
}

interface Course {
  code: string
  name: string
  priority: number
  semester: string
}

interface CareerStage {
  phase: string
  duration: string
  goals: string[]
  expectedOutcome: string
}

interface Article {
  title: string
  source: string
  url: string
  description: string
  category: string
  date: string
}

interface Video {
  title: string
  channel: string
  url: string
  description: string
  duration: string
  category: string
}

interface Podcast {
  title: string
  url: string
  description: string
  category: string
}

interface LearningResources {
  articles: Article[]
  videos: Video[]
  podcasts: Podcast[]
  lastUpdated: string
}

interface MarketInsights {
  lastUpdated: string
  aiGenerated: boolean
  trends: string[]
  hotRoles: string[]
  salaryTrends: string
  hiringOutlook: string
  activelyHiring?: string[]
  hiringFreezes?: string[]
}

interface CareerData {
  jobs: Job[]
  certifications: { essential: Certification[]; advanced: Certification[] }
  courses: { essential: Course[]; recommended: Course[] }
  careerPath: { stages: CareerStage[] }
  salaryData: Record<string, Record<string, { min: number; max: number; median: number }>>
  resources?: LearningResources
  marketInsights?: MarketInsights
}

// Cache key for Supabase user_cache - version 4
const CACHE_KEY = 'career_data_v4'

function formatSalary(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getLikelihoodColor(likelihood: string): string {
  if (likelihood.includes('<0.1%') || likelihood.includes('<0.5%') || likelihood.includes('<1%')) {
    return 'bg-red-500/10 text-red-500 border-red-500/30'
  }
  if (likelihood.includes('1-') || likelihood.includes('2-') || likelihood.includes('3-')) {
    return 'bg-orange-500/10 text-orange-500 border-orange-500/30'
  }
  if (likelihood.includes('5-') || likelihood.includes('10-') || likelihood.includes('15-')) {
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
  }
  if (likelihood.includes('20-') || likelihood.includes('25-') || likelihood.includes('30-')) {
    return 'bg-green-500/10 text-green-500 border-green-500/30'
  }
  if (likelihood.includes('40-') || likelihood.includes('50-') || likelihood.includes('60-')) {
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
  }
  return 'bg-gray-500/10 text-gray-500 border-gray-500/30'
}

function CareerStageTab({ stage, label }: { stage: CareerStageData | undefined; label: string }) {
  if (!stage) {
    return (
      <div className="py-6 sm:py-8 text-center text-muted-foreground">
        <p className="text-sm">Career stage data not available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
          <p className="font-semibold text-sm sm:text-base">{stage.title || 'N/A'}</p>
        </div>
        <Badge className={`text-[10px] sm:text-xs shrink-0 ${getLikelihoodColor(stage.likelihood || '')}`}>
          {stage.likelihood || 'Unknown'}
        </Badge>
      </div>

      <div className="p-2.5 sm:p-3 rounded-lg bg-green-500/5 border border-green-500/20">
        <p className="text-xs sm:text-sm font-medium text-green-500 flex items-center gap-1.5 sm:gap-2">
          <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {stage.salary || 'Varies'}
        </p>
      </div>

      <div className="overflow-hidden">
        <p className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
          Requirements
        </p>
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {(stage.requirements || []).slice(0, 6).map((req, i) => (
            <Badge key={i} variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
              {req}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 overflow-hidden">
        <p className="text-xs sm:text-sm font-medium mb-1">How to Get Here</p>
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{stage.howToGetHere || 'Details not available'}</p>
      </div>

      <div className="p-2.5 sm:p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 overflow-hidden">
        <p className="text-xs sm:text-sm font-medium mb-1 flex items-center gap-1.5 sm:gap-2 text-blue-500">
          <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          BYU Advice
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{stage.byuSpecific || 'Contact career services'}</p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
        <span className="font-medium">Competitiveness:</span>
        <span className="text-muted-foreground">{stage.competitiveness || 'Varies'}</span>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function JobCard({ job, isStarred, onToggleStar }: { job: any; isStarred: boolean; onToggleStar: (jobTitle: string) => void }) {
  const [activeStage, setActiveStage] = useState<'newGrad' | 'twoToThreeYears' | 'fiveToSevenYears' | 'tenPlusYears'>('newGrad')

  const stages = [
    { key: 'newGrad' as const, label: 'New Grad', shortLabel: 'Now' },
    { key: 'twoToThreeYears' as const, label: '2-3 Years', shortLabel: '2-3Y' },
    { key: 'fiveToSevenYears' as const, label: '5-7 Years', shortLabel: '5-7Y' },
    { key: 'tenPlusYears' as const, label: '10+ Years', shortLabel: '10+Y' },
  ]

  const categoryColors: Record<string, string> = {
    'Product Management': 'bg-purple-500/10 text-purple-500',
    'Program Management': 'bg-blue-500/10 text-blue-500',
    'Strategy & Operations': 'bg-green-500/10 text-green-500',
    'Consulting': 'bg-amber-500/10 text-amber-500',
    'Sales & Business Development': 'bg-orange-500/10 text-orange-500',
    'Finance/VC': 'bg-pink-500/10 text-pink-500',
    'Entrepreneurship': 'bg-red-500/10 text-red-500',
    'Executive': 'bg-indigo-500/10 text-indigo-500',
    'Finance/Corp Dev': 'bg-cyan-500/10 text-cyan-500',
  }

  // Handle old data format (with salaryRange) vs new format (with careerProgression)
  const hasCareerProgression = job.careerProgression && typeof job.careerProgression === 'object'

  // Fallback for old format jobs
  if (!hasCareerProgression) {
    return (
      <Card className={`hover:border-amber-500/50 transition-colors ${isStarred ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-500" />
                {job.title}
              </CardTitle>
              <CardDescription className="mt-1">
                {(job.companies || []).slice(0, 3).join(', ')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleStar(job.title)}
                className={`p-1.5 rounded-full transition-colors ${
                  isStarred
                    ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                }`}
                title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
              </button>
              <Badge className={categoryColors[job.category] || 'bg-gray-500/10 text-gray-500'}>
                {job.category || job.difficulty || 'Role'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.salaryRange && (
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <p className="text-sm font-medium text-green-500 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                ${(job.salaryRange.min / 1000).toFixed(0)}k - ${(job.salaryRange.max / 1000).toFixed(0)}k
                {job.salaryRange.bonus && <span className="text-xs text-muted-foreground">+ {job.salaryRange.bonus}</span>}
              </p>
            </div>
          )}
          {job.requirements && (
            <div className="flex flex-wrap gap-1">
              {job.requirements.slice(0, 4).map((req: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {req}
                </Badge>
              ))}
            </div>
          )}
          {job.interviewProcess && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Interview:</span> {job.interviewProcess}
            </div>
          )}
          <Button asChild className="w-full">
            <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
              View Jobs
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`hover:border-amber-500/50 transition-colors overflow-hidden ${isStarred ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">{job.title}</span>
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm truncate">
              {(job.companies || []).slice(0, 2).join(', ')}{(job.companies || []).length > 2 ? ` +${job.companies.length - 2}` : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => onToggleStar(job.title)}
              className={`p-1.5 rounded-full transition-colors ${
                isStarred
                  ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
              }`}
              title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
            </button>
            <Badge className={`text-[10px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap ${categoryColors[job.category] || 'bg-gray-500/10 text-gray-500'}`}>
              <span className="hidden sm:inline">{job.category}</span>
              <span className="sm:hidden">{job.category.split(' ')[0]}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 overflow-hidden">
        {/* Career Stage Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {stages.map((stage) => (
            <button
              key={stage.key}
              onClick={() => setActiveStage(stage.key)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeStage === stage.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="hidden sm:inline">{stage.label}</span>
              <span className="sm:hidden">{stage.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Stage Content */}
        <CareerStageTab
          stage={job.careerProgression?.[activeStage]}
          label={stages.find(s => s.key === activeStage)?.label || ''}
        />

        <div className="text-sm text-muted-foreground border-t pt-4 overflow-hidden">
          <span className="font-medium">Interview:</span>{' '}
          <span className="line-clamp-2">{job.interviewProcess || 'Varies by company'}</span>
        </div>

        <Button asChild className="w-full">
          <a href={job.applicationUrl || '#'} target="_blank" rel="noopener noreferrer">
            View Jobs
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

function CertificationCard({ cert }: { cert: Certification }) {
  return (
    <div className="p-4 rounded-lg border bg-muted/30 hover:border-amber-500/50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            {cert.name}
          </h4>
          <p className="text-sm text-muted-foreground">{cert.provider}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-green-500">
            +{formatSalary(cert.salaryBoost)}/yr
          </div>
          <p className="text-xs text-muted-foreground">Salary boost</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          ${cert.cost}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {cert.duration}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {cert.companies.slice(0, 4).map((company) => (
          <Badge key={company} variant="secondary" className="text-xs">
            {company}
          </Badge>
        ))}
      </div>

      <Button variant="outline" size="sm" asChild className="w-full">
        <a href={cert.url} target="_blank" rel="noopener noreferrer">
          Start Certification
          <ExternalLink className="w-3 h-3 ml-2" />
        </a>
      </Button>
    </div>
  )
}

function CareerStageCard({ stage, index }: { stage: CareerStage; index: number }) {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500']

  return (
    <div className="relative pl-6 sm:pl-8 pb-6 sm:pb-8 border-l-2 border-muted last:border-l-0 last:pb-0">
      <div className={`absolute left-[-7px] sm:left-[-9px] top-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full ${colors[index % colors.length]}`} />
      <div className="p-3 sm:p-4 rounded-lg border bg-muted/30">
        <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm sm:text-base">{stage.phase}</h4>
          <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">{stage.duration}</Badge>
        </div>
        <ul className="space-y-1 mb-3">
          {stage.goals.map((goal, i) => (
            <li key={i} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
              <span>{goal}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-amber-500 font-medium">
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>{stage.expectedOutcome}</span>
        </div>
      </div>
    </div>
  )
}

export function CareerPlanning() {
  const [data, setData] = useState<CareerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('market')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [starredJobs, setStarredJobs] = useState<string[]>([])
  const [showStarredOnly, setShowStarredOnly] = useState(false)

  // Load starred jobs from Supabase
  const loadStarredJobs = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: siteContent } = await (supabase.from('site_content') as any)
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'starred_jobs')
      .single()

    if (siteContent?.value) {
      try {
        const parsed = JSON.parse(siteContent.value)
        if (Array.isArray(parsed)) {
          setStarredJobs(parsed)
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  // Save starred jobs to Supabase
  const saveStarredJobs = useCallback(async (jobs: string[]) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('site_content') as any).upsert({
      key: 'starred_jobs',
      value: JSON.stringify(jobs),
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key,user_id' })
  }, [])

  // Toggle star status for a job
  const toggleStarJob = useCallback((jobTitle: string) => {
    setStarredJobs(prev => {
      const isStarred = prev.includes(jobTitle)
      const updated = isStarred
        ? prev.filter(j => j !== jobTitle)
        : [...prev, jobTitle]

      // Save to database
      saveStarredJobs(updated)
      return updated
    })
  }, [saveStarredJobs])

  // Load starred jobs on mount
  useEffect(() => {
    loadStarredJobs()
  }, [loadStarredJobs])

  const getCachedData = useCallback(async (): Promise<CareerData | null> => {
    try {
      const res = await fetch(`/api/cache?key=${CACHE_KEY}`)
      const result = await res.json()
      if (result.data) {
        if (result.timestamp) {
          setLastUpdated(new Date(result.timestamp))
        }
        return result.data as CareerData
      }
    } catch {
      // Cache read failed, proceed with fetch
    }
    return null
  }, [])

  const setCachedData = useCallback(async (newData: CareerData) => {
    try {
      const res = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: CACHE_KEY, value: newData, ttl_days: 7 }),
      })
      const result = await res.json()
      if (result.timestamp) {
        setLastUpdated(new Date(result.timestamp))
      }
    } catch {
      // Cache write failed, continue without caching
    }
  }, [])

  const fetchCareerData = useCallback(async (forceRefresh = false) => {
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = await getCachedData()
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    if (forceRefresh) setIsRefreshing(true)

    try {
      const response = await fetch('/api/ai/career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'complete-plan',
          data: {
            currentYear: 'Junior',
            skills: ['Python', 'TypeScript', 'Machine Learning', 'React', 'Next.js'],
            interests: ['AI/ML', 'Startups', 'Technical Founding'],
            targetRole: 'ML Engineer at top AI company -> Technical Founder',
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch career data')

      const result = await response.json()
      if (result.success && result.plan) {
        setData(result.plan)
        await setCachedData(result.plan)
      }
    } catch (error) {
      console.error('Failed to fetch career data:', error)
      // Try to use cached data as fallback
      const cached = await getCachedData()
      if (cached) {
        setData(cached)
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [getCachedData, setCachedData])

  const handleRefresh = () => {
    fetchCareerData(true)
  }

  useEffect(() => {
    fetchCareerData()
  }, [fetchCareerData])

  // Format last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return null
    const now = new Date()
    const diffMs = now.getTime() - lastUpdated.getTime()
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000))

    if (diffDays > 0) return `Updated ${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `Updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Updated just now'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">Failed to load career data</p>
          <Button onClick={() => fetchCareerData(true)}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with salary potential */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                <span className="truncate">Career Hub</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                <span className="hidden sm:inline">Business & Leadership roles - real likelihood data</span>
                <span className="sm:hidden">Top roles & salaries</span>
                {lastUpdated && (
                  <span className="block sm:inline sm:ml-2 text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-0">
                    {getLastUpdatedText()}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shrink-0 h-8 px-2 sm:px-3"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-base sm:text-xl font-bold">$150-180k</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">New Grad</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-base sm:text-xl font-bold">$250-400k</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Senior</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-green-500" />
              <p className="text-base sm:text-xl font-bold">$500k-1M</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Director</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-base sm:text-xl font-bold">$10M+</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Founder</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 h-auto">
          <TabsTrigger value="market" className="px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Market</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Roadmap</span>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <Briefcase className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Jobs</span>
          </TabsTrigger>
          <TabsTrigger value="certs" className="px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <Award className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Certs</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <BookOpen className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Courses</span>
          </TabsTrigger>
          <TabsTrigger value="learn" className="px-1 sm:px-3 py-2 text-xs sm:text-sm">
            <GraduationCap className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Learn</span>
          </TabsTrigger>
        </TabsList>

        {/* Market Insights Tab - AI Generated */}
        <TabsContent value="market" className="space-y-6">
          {data.marketInsights?.aiGenerated ? (
            <>
              {/* Hiring Outlook */}
              <Card className="border-green-500/30">
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    2025 Hiring Outlook
                    <Badge variant="outline" className="ml-auto text-[10px] text-green-500 border-green-500/50">
                      AI Generated
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Updated: {new Date(data.marketInsights.lastUpdated).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <p className="text-sm text-muted-foreground">{data.marketInsights.hiringOutlook}</p>
                </CardContent>
              </Card>

              {/* Hot Roles */}
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    Hottest Roles Right Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="space-y-2">
                    {data.marketInsights.hotRoles.map((role, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">#{i + 1}</Badge>
                        <span className="text-sm">{role}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trends */}
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    Top Hiring Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="space-y-2">
                    {data.marketInsights.trends.map((trend, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{trend}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Salary Trends */}
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    Salary Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <p className="text-sm text-muted-foreground">{data.marketInsights.salaryTrends}</p>
                </CardContent>
              </Card>

              {/* Companies Hiring */}
              <div className="grid sm:grid-cols-2 gap-4">
                {data.marketInsights.activelyHiring && data.marketInsights.activelyHiring.length > 0 && (
                  <Card className="border-green-500/20">
                    <CardHeader className="px-3 sm:px-6 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                        Actively Hiring
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                      <div className="flex flex-wrap gap-1">
                        {data.marketInsights.activelyHiring.map((company, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-green-500 border-green-500/30">
                            {company}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {data.marketInsights.hiringFreezes && data.marketInsights.hiringFreezes.length > 0 && (
                  <Card className="border-red-500/20">
                    <CardHeader className="px-3 sm:px-6 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-500">
                        <Clock className="w-4 h-4" />
                        Hiring Slowdowns
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                      <div className="flex flex-wrap gap-1">
                        {data.marketInsights.hiringFreezes.map((company, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-red-500 border-red-500/30">
                            {company}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Market insights loading...</p>
                <p className="text-xs text-muted-foreground mt-2">Refresh to get AI-generated market data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Your Career Path
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                From student to $500k+ or founder
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="relative">
                {data.careerPath.stages.map((stage, index) => (
                  <CareerStageCard key={stage.phase} stage={stage} index={index} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          {/* Starred filter and count */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                showStarredOnly
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showStarredOnly ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{showStarredOnly ? 'Showing Starred' : 'Show Starred Only'}</span>
              <span className="sm:hidden">{showStarredOnly ? 'Starred' : 'Filter'}</span>
            </button>
            {starredJobs.length > 0 && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                {starredJobs.length} starred
              </span>
            )}
          </div>

          {/* Jobs grid - single column on mobile for better readability */}
          <div className="grid gap-4 md:grid-cols-2">
            {data.jobs
              .filter(job => !showStarredOnly || starredJobs.includes(job.title))
              .map((job) => (
                <JobCard
                  key={job.title}
                  job={job}
                  isStarred={starredJobs.includes(job.title)}
                  onToggleStar={toggleStarJob}
                />
              ))}
          </div>

          {/* Empty state for starred filter */}
          {showStarredOnly && starredJobs.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No starred jobs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Star the jobs you&apos;re most interested in to see them here
                </p>
                <Button variant="outline" onClick={() => setShowStarredOnly(false)}>
                  View All Jobs
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="certs" className="space-y-6">
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Essential Certifications
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Industry-recognized credentials that boost salary
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {data.certifications.essential.map((cert) => (
                  <CertificationCard key={cert.name} cert={cert} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                Advanced Learning
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Specialized programs for competitive edge
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {data.certifications.advanced.map((cert) => (
                  <CertificationCard key={cert.name} cert={cert} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Essential Courses
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Must-take courses for top tech companies
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2">
                {data.courses.essential.map((course) => (
                  <div
                    key={course.code}
                    className="flex items-start sm:items-center justify-between gap-2 p-2.5 sm:p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Badge variant={course.priority === 1 ? 'default' : 'secondary'} className="shrink-0 text-[10px] sm:text-xs">
                        P{course.priority}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{course.code}: {course.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{course.semester}</p>
                      </div>
                    </div>
                    {course.priority === 1 && (
                      <Badge className="bg-red-500/10 text-red-500 shrink-0 text-[10px] sm:text-xs">Critical</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                Recommended Electives
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Additional courses for specialization
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2">
                {data.courses.recommended.map((course) => (
                  <div
                    key={course.code}
                    className="flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-muted/30"
                  >
                    <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">P{course.priority}</Badge>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{course.code}: {course.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{course.semester}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Resources Tab */}
        <TabsContent value="learn" className="space-y-6">
          {data.resources ? (
            <>
              {/* Articles Section */}
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    Must-Read Articles
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Stay current with AI and tech industry
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="grid gap-2 sm:gap-3">
                    {data.resources.articles.map((article) => (
                      <a
                        key={article.url}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 sm:p-4 rounded-lg border bg-muted/30 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm sm:text-base group-hover:text-blue-500 transition-colors line-clamp-2">
                                {article.title}
                              </h4>
                              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{article.description}</p>
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] sm:text-xs">{article.category}</Badge>
                              <span className="truncate">{article.source}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Videos Section */}
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Youtube className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                    Essential Videos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Technical deep-dives and career guidance
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
                    {data.resources.videos.map((video) => (
                      <a
                        key={video.url}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 sm:p-4 rounded-lg border bg-muted/30 hover:border-red-500/50 hover:bg-red-500/5 transition-colors group"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <Youtube className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base group-hover:text-red-500 transition-colors line-clamp-2 mb-1">
                              {video.title}
                            </h4>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">{video.channel}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] sm:text-xs">{video.category}</Badge>
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {video.duration}
                              </span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Podcasts Section */}
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    Podcasts
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Stay informed during commute
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {data.resources.podcasts.map((podcast) => (
                      <a
                        key={podcast.url}
                        href={podcast.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 sm:p-4 rounded-lg border bg-muted/30 hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors group"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                          </div>
                          <h4 className="font-medium text-sm sm:text-base group-hover:text-purple-500 transition-colors truncate">
                            {podcast.title}
                          </h4>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{podcast.description}</p>
                        <Badge variant="outline" className="text-[10px] sm:text-xs mt-2">{podcast.category}</Badge>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading learning resources...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Github,
  Users,
  Code,
  Star,
  Briefcase,
  CheckCircle2,
  Target,
  Rocket,
  Award,
  BookOpen,
  ExternalLink,
  Loader2,
  RefreshCw,
  Building2,
  DollarSign,
} from 'lucide-react'

interface Requirement {
  title: string
  description: string
  target: string
  current?: number
  targetNum?: number
  examples?: string[]
  tips?: string[]
  priority: 'critical' | 'high' | 'medium'
}

interface CompanyRecommendation {
  name: string
  type: string
  roles: string[]
  applicationUrl: string
  deadline: string
  requirements: string[]
  whyApply: string
  matchScore: number
  salaryRange: {
    min: number
    max: number
    bonus?: string
  }
}

const githubRequirements: Requirement[] = [
  {
    title: 'Active Contribution History',
    description: 'Consistent commits showing ongoing development activity',
    target: '200+ commits in past year',
    current: 0,
    targetNum: 200,
    tips: [
      'Commit daily, even small changes',
      'Work on multiple projects throughout the week',
      'Include meaningful commit messages',
    ],
    priority: 'critical',
  },
  {
    title: 'Production-Ready Projects',
    description: 'Full-stack applications deployed and accessible to users',
    target: '2-3 deployed projects',
    current: 0,
    targetNum: 3,
    examples: [
      'SaaS application with user auth',
      'AI-powered tool or API',
      'Mobile app or Chrome extension',
    ],
    priority: 'critical',
  },
  {
    title: 'Open Source Contributions',
    description: 'PRs merged into established open source projects',
    target: '3-5 meaningful PRs',
    current: 0,
    targetNum: 5,
    tips: [
      'Start with documentation fixes',
      'Look for "good first issue" labels',
      'Contribute to tools you actually use',
    ],
    priority: 'high',
  },
]

const projectRequirements: Requirement[] = [
  {
    title: 'Real User Base',
    description: 'Products actively used by people other than yourself',
    target: '10-100+ active users',
    examples: [
      'Friends/family using your app daily',
      'Open source tool with GitHub stars',
      'Side project with paying customers',
    ],
    tips: [
      'Share with your network first',
      'Post on Product Hunt, Hacker News',
      'Build something you personally need',
    ],
    priority: 'critical',
  },
  {
    title: 'Technical Complexity',
    description: 'Projects demonstrating advanced engineering skills',
    target: 'Complex systems with multiple components',
    examples: [
      'Full-stack with database + API + frontend',
      'AI/ML integration with real inference',
      'Real-time features (WebSockets, streaming)',
      'Authentication + authorization systems',
    ],
    priority: 'critical',
  },
  {
    title: 'Project Documentation',
    description: 'Professional README, architecture docs, and deployment guides',
    target: 'README with screenshots, setup, and architecture',
    tips: [
      'Include GIFs or videos of the app',
      'Document API endpoints if applicable',
      'Explain design decisions and tradeoffs',
    ],
    priority: 'high',
  },
]

const interviewRequirements: Requirement[] = [
  {
    title: 'Data Structures & Algorithms',
    description: 'LeetCode/HackerRank practice for technical interviews',
    target: '100-150 problems completed',
    current: 0,
    targetNum: 150,
    tips: [
      'Focus on Medium difficulty',
      'Master patterns: BFS, DFS, DP, Two Pointers',
      'Practice explaining your thought process',
    ],
    priority: 'critical',
  },
  {
    title: 'System Design Knowledge',
    description: 'Understanding of scalable system architecture',
    target: 'Basic system design concepts',
    examples: [
      'Load balancing and caching',
      'Database sharding and replication',
      'Microservices vs monolith tradeoffs',
      'API design best practices',
    ],
    priority: 'high',
  },
  {
    title: 'Behavioral Preparation',
    description: 'STAR method stories for leadership and impact',
    target: '5-7 prepared stories',
    tips: [
      'Use STAR format: Situation, Task, Action, Result',
      'Include metrics and specific outcomes',
      'Practice with a friend or mentor',
    ],
    priority: 'medium',
  },
]

const typeColors: Record<string, string> = {
  'FAANG': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'AI Lab': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'AI Startup': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Startup': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'Fintech': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'Data/AI': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
}

function RequirementCard({ requirement }: { requirement: Requirement }) {
  const priorityColors = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  }

  const progress = requirement.current !== undefined && requirement.targetNum
    ? Math.round((requirement.current / requirement.targetNum) * 100)
    : null

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{requirement.title}</h4>
            <Badge variant="outline" className={priorityColors[requirement.priority]}>
              {requirement.priority}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{requirement.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium text-amber-500">{requirement.target}</p>
        </div>
      </div>

      {progress !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span>{requirement.current} / {requirement.targetNum}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {requirement.examples && requirement.examples.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Examples:</p>
          <ul className="space-y-1">
            {requirement.examples.map((example, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
                {example}
              </li>
            ))}
          </ul>
        </div>
      )}

      {requirement.tips && requirement.tips.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Tips:</p>
          <ul className="space-y-1">
            {requirement.tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Star className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function formatMonthlySalary(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function CompanyCard({ company }: { company: CompanyRecommendation }) {
  return (
    <div className="p-4 rounded-lg border bg-muted/30 hover:border-amber-500/50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-amber-500" />
            <h4 className="font-medium">{company.name}</h4>
          </div>
          <Badge variant="outline" className={typeColors[company.type] || 'bg-gray-500/10 text-gray-500'}>
            {company.type}
          </Badge>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
            <Target className="w-4 h-4" />
            {company.matchScore}%
          </div>
          <p className="text-xs text-muted-foreground">Match</p>
        </div>
      </div>

      {/* Salary Display */}
      {company.salaryRange && (
        <div className="mb-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="font-bold text-green-500">
              {formatMonthlySalary(company.salaryRange.min)} - {formatMonthlySalary(company.salaryRange.max)}/mo
            </span>
          </div>
          {company.salaryRange.bonus && (
            <p className="text-xs text-muted-foreground pl-6">
              + {company.salaryRange.bonus}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {company.roles.map((role) => (
          <Badge key={role} variant="secondary" className="text-xs">
            {role}
          </Badge>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-3">{company.whyApply}</p>

      <div className="text-xs text-muted-foreground mb-3">
        <span className="font-medium">Deadline:</span> {company.deadline}
      </div>

      {company.requirements.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Requirements:</p>
          <div className="flex flex-wrap gap-1">
            {company.requirements.map((req) => (
              <Badge key={req} variant="outline" className="text-xs">
                {req}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="default"
        size="sm"
        className="w-full"
        asChild
      >
        <a
          href={company.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Apply Now
          <ExternalLink className="w-3 h-3 ml-2" />
        </a>
      </Button>
    </div>
  )
}

interface InternshipRequirementsProps {
  userSkills?: string[]
  userInterests?: string[]
  currentProgress?: number
}

export function InternshipRequirements({
  userSkills,
  userInterests,
  currentProgress = 0,
}: InternshipRequirementsProps = {}) {
  const [companies, setCompanies] = useState<CompanyRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    // If no user skills/interests provided, skip AI recommendations and use fallback
    if (!userSkills?.length || !userInterests?.length) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/ai/internships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: userSkills,
          interests: userInterests,
          currentProgress,
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch recommendations')

      const data = await response.json()
      if (data.recommendations) {
        setCompanies(data.recommendations)
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
      setError('Failed to load personalized recommendations')
      // Use fallback data with salary info (based on levels.fyi data)
      setCompanies([
        {
          name: 'Google',
          type: 'FAANG',
          roles: ['STEP Intern', 'SWE Intern'],
          applicationUrl: 'https://careers.google.com/students/',
          deadline: 'Rolling - Check careers.google.com',
          requirements: ['Data Structures', 'Algorithms', 'One programming language'],
          whyApply: 'World-class mentorship and exposure to massive scale systems',
          matchScore: 85,
          salaryRange: { min: 9500, max: 11500, bonus: 'Housing $3k/month + signing bonus' },
        },
        {
          name: 'Meta',
          type: 'FAANG',
          roles: ['SWE Intern', 'ML Intern'],
          applicationUrl: 'https://www.metacareers.com/students-and-grads/',
          deadline: 'Rolling - Check metacareers.com',
          requirements: ['Python/C++', 'Strong algorithms', 'System design basics'],
          whyApply: 'Leading AI research lab and massive product impact',
          matchScore: 82,
          salaryRange: { min: 10000, max: 12000, bonus: 'Housing $3k/month' },
        },
        {
          name: 'OpenAI',
          type: 'AI Lab',
          roles: ['Research Intern', 'Engineering Intern'],
          applicationUrl: 'https://openai.com/careers/',
          deadline: 'Rolling',
          requirements: ['ML/DL experience', 'Python', 'Research experience preferred'],
          whyApply: 'Frontier AI research, shaping the future of AGI',
          matchScore: 75,
          salaryRange: { min: 12000, max: 15000, bonus: 'Relocation assistance' },
        },
        {
          name: 'Anthropic',
          type: 'AI Lab',
          roles: ['Research Intern', 'SWE Intern'],
          applicationUrl: 'https://www.anthropic.com/careers',
          deadline: 'Rolling',
          requirements: ['Strong ML fundamentals', 'Python', 'AI safety interest'],
          whyApply: 'Leading AI safety research, building Claude',
          matchScore: 80,
          salaryRange: { min: 11000, max: 14000, bonus: 'Housing stipend' },
        },
        {
          name: 'Jane Street',
          type: 'Fintech',
          roles: ['SWE Intern', 'Quant Intern'],
          applicationUrl: 'https://www.janestreet.com/join-jane-street/internships/',
          deadline: 'September - January',
          requirements: ['Strong math', 'OCaml/Python', 'Problem solving'],
          whyApply: 'Highest paying internships, intellectual culture',
          matchScore: 70,
          salaryRange: { min: 16000, max: 20000, bonus: 'Housing provided' },
        },
        {
          name: 'Stripe',
          type: 'Fintech',
          roles: ['SWE Intern'],
          applicationUrl: 'https://stripe.com/jobs/university',
          deadline: 'Rolling - Check stripe.com/jobs',
          requirements: ['Strong coding skills', 'Web development', 'API design'],
          whyApply: 'Best-in-class engineering culture, financial infrastructure',
          matchScore: 83,
          salaryRange: { min: 9000, max: 11000, bonus: 'Housing $2.5k/month' },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSkills, userInterests, currentProgress])

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-amber-500" />
            Internship Requirements
          </CardTitle>
          <CardDescription>
            What top tech companies look for in internship candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            FAANG and top AI companies evaluate candidates on their GitHub presence,
            real-world projects, and technical interview skills. Here&apos;s what you need
            to build to stand out.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Github className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-xl font-bold">200+</p>
              <p className="text-xs text-muted-foreground">Commits/Year</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Code className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xl font-bold">2-3</p>
              <p className="text-xs text-muted-foreground">Deployed Projects</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-xl font-bold">10+</p>
              <p className="text-xs text-muted-foreground">Real Users</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Target className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <p className="text-xl font-bold">100+</p>
              <p className="text-xs text-muted-foreground">DSA Problems</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Companies with AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Recommended Companies
              </CardTitle>
              <CardDescription>
                AI-powered personalized internship recommendations with direct application links
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecommendations}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error && companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {error}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {companies.map((company) => (
                <CompanyCard key={company.name} company={company} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GitHub Presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Presence
          </CardTitle>
          <CardDescription>
            Your GitHub profile is your engineering resume
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {githubRequirements.map((req) => (
            <RequirementCard key={req.title} requirement={req} />
          ))}
        </CardContent>
      </Card>

      {/* Project Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-500" />
            Project Portfolio
          </CardTitle>
          <CardDescription>
            What makes a project stand out to recruiters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectRequirements.map((req) => (
            <RequirementCard key={req.title} requirement={req} />
          ))}
        </CardContent>
      </Card>

      {/* Interview Prep */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Interview Preparation
          </CardTitle>
          <CardDescription>
            Technical and behavioral interview readiness
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {interviewRequirements.map((req) => (
            <RequirementCard key={req.title} requirement={req} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

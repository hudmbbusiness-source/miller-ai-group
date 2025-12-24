import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SOCIAL_LINKS } from '@/types'
import {
  Download,
  Linkedin,
  Instagram,
  ExternalLink,
  Mail,
  MapPin,
  Globe,
  GraduationCap,
  Briefcase,
  Award,
  Code2,
  Rocket,
  ArrowLeft,
  Calendar
} from 'lucide-react'
import type { ResumeItem } from '@/lib/actions/resume'

interface ResumeSummary {
  id: string
  summary: string | null
  headline: string | null
  location: string | null
  email: string | null
  phone: string | null
  website: string | null
}

// Default resume data based on Hudson's actual resume
const DEFAULT_SUMMARY: ResumeSummary = {
  id: 'default',
  headline: 'Founder & Entrepreneur | Business & Computer Science Student at BYU',
  summary: `Ambitious entrepreneur and student at Brigham Young University, pursuing dual studies in Business at the Marriott School of Business and Computer Science. Currently building multiple AI-powered ventures through Miller AI Group. Proven track record of leadership as former CEO of CozyFilmz, with experience in strategic planning, partnership negotiations, and brand development. Fluent in Spanish with a strong foundation in operational excellence and customer-focused decision making.`,
  location: 'Provo, Utah',
  email: 'Hudmbbusiness@gmail.com',
  phone: '(385)-405-5829',
  website: 'https://miller-ai-group.vercel.app',
}

const DEFAULT_ITEMS: ResumeItem[] = [
  // Education
  {
    id: '1',
    title: 'Brigham Young University - Marriott School of Business',
    description: `Bachelor's in Business with Computer Science emphasis
• 3.55 GPA
• Marriott School of Business Student
• Spanish Fluent Certified
• Focus: Entrepreneurship, AI/ML, Software Engineering`,
    category: 'education',
    start_date: '2024-09-01',
    end_date: null,
    is_current: true,
    visible: true,
    order_index: 0,
    created_at: '2024-01-01',
  },
  {
    id: '2',
    title: 'Davis High School',
    description: `High School Diploma - Kaysville, UT
• 3.7 GPA
• Honor Roll 2022
• Strong foundation in academics and leadership`,
    category: 'education',
    start_date: '2018-08-01',
    end_date: '2022-05-01',
    is_current: false,
    visible: true,
    order_index: 1,
    created_at: '2024-01-01',
  },
  // Experience / Startups
  {
    id: '3',
    title: 'Founder & CEO - Miller AI Group',
    description: `Leading AI-focused venture studio building multiple products:
• Kachow - Investor sentiment analysis platform
• StuntMan AI - Cryptocurrency trading bot
• BrainBox AI - Intelligent note-taking with AI insights
• Building full-stack applications with Next.js, TypeScript, and AI integrations`,
    category: 'startup',
    start_date: '2024-06-01',
    end_date: null,
    is_current: true,
    visible: true,
    order_index: 2,
    created_at: '2024-01-01',
  },
  {
    id: '4',
    title: 'CEO - CozyFilmz',
    description: `Led company operations and growth strategy
• Achieved company growth by implementing strategic plans and streamlining operations
• Managed and negotiated partnerships by creating contracts and deals
• Implemented cost-saving initiatives to increase company profits
• Marketed and advertised to achieve brand recognition
• Organized local sponsors to cover event costs and support the business`,
    category: 'experience',
    start_date: '2025-01-01',
    end_date: '2025-06-01',
    is_current: false,
    visible: true,
    order_index: 3,
    created_at: '2024-01-01',
  },
  {
    id: '5',
    title: 'Warehouse Worker - BadFlag',
    description: `Operations and logistics experience
• Loaded, unloaded and moved material to and from storage to production areas
• Maintained a clean workspace by enforcing housekeeping guidelines
• Reduced order processing time by implementing effective manufacturing and boxing techniques`,
    category: 'experience',
    start_date: '2019-09-01',
    end_date: '2021-09-01',
    is_current: false,
    visible: true,
    order_index: 4,
    created_at: '2024-01-01',
  },
  // Skills
  {
    id: '6',
    title: 'Technical Skills',
    description: `• Full-Stack Development (Next.js, React, TypeScript, Node.js)
• AI/ML Integration (Groq, OpenAI, Replicate)
• Database Management (Supabase, PostgreSQL)
• Cloud Deployment (Vercel, AWS)
• Version Control (Git, GitHub)`,
    category: 'skill',
    start_date: null,
    end_date: null,
    is_current: false,
    visible: true,
    order_index: 5,
    created_at: '2024-01-01',
  },
  {
    id: '7',
    title: 'Business & Leadership',
    description: `• Effective Decision Making
• Customer Focus
• Entrepreneurial Mindset
• Operational Excellence
• Strategic Planning
• Partnership Negotiations`,
    category: 'skill',
    start_date: null,
    end_date: null,
    is_current: false,
    visible: true,
    order_index: 6,
    created_at: '2024-01-01',
  },
  {
    id: '8',
    title: 'Languages',
    description: `• English (Native)
• Spanish (Fluent) - Certified`,
    category: 'skill',
    start_date: null,
    end_date: null,
    is_current: false,
    visible: true,
    order_index: 7,
    created_at: '2024-01-01',
  },
  // Achievements
  {
    id: '9',
    title: 'Founded Miller AI Group',
    description: 'Launched AI-focused venture studio with multiple products in development, including investor sentiment analysis and crypto trading platforms.',
    category: 'achievement',
    start_date: '2024-06-01',
    end_date: null,
    is_current: true,
    visible: true,
    order_index: 8,
    created_at: '2024-01-01',
  },
  {
    id: '10',
    title: 'BYU Marriott School of Business Admission',
    description: 'Accepted into one of the top-ranked business schools in the nation, known for producing successful entrepreneurs and business leaders.',
    category: 'achievement',
    start_date: '2024-09-01',
    end_date: null,
    is_current: false,
    visible: true,
    order_index: 9,
    created_at: '2024-01-01',
  },
  {
    id: '11',
    title: 'Spanish Fluency Certification',
    description: 'Achieved certified fluency in Spanish, enabling communication with Spanish-speaking clients and partners.',
    category: 'achievement',
    start_date: null,
    end_date: null,
    is_current: false,
    visible: true,
    order_index: 10,
    created_at: '2024-01-01',
  },
]

const categoryConfig: Record<string, { label: string; icon: typeof GraduationCap; color: string }> = {
  education: { label: 'Education', icon: GraduationCap, color: 'text-blue-500' },
  experience: { label: 'Experience', icon: Briefcase, color: 'text-green-500' },
  startup: { label: 'Ventures', icon: Rocket, color: 'text-purple-500' },
  achievement: { label: 'Achievements', icon: Award, color: 'text-yellow-500' },
  skill: { label: 'Skills', icon: Code2, color: 'text-cyan-500' },
  certification: { label: 'Certifications', icon: Award, color: 'text-orange-500' },
}

export const metadata = {
  title: 'Resume - Hudson Barnes',
  description: 'View Hudson Barnes\' professional resume, experience, education, and accomplishments.',
}

export default async function ResumePage() {
  const supabase = await createClient()

  // Fetch resume summary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: summaryData } = await (supabase.from('resume_summary') as any)
    .select('*')
    .limit(1)
    .single()

  // Fetch resume items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemsData } = await (supabase.from('resume_items') as any)
    .select('*')
    .eq('visible', true)
    .order('order_index')

  // Use database data if available, otherwise use defaults
  const summary = (summaryData as ResumeSummary | null) || DEFAULT_SUMMARY
  const items = ((itemsData && itemsData.length > 0 ? itemsData : DEFAULT_ITEMS) as ResumeItem[])

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ResumeItem[]>)

  // Order of sections
  const sectionOrder = ['education', 'startup', 'experience', 'skill', 'achievement', 'certification']

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold hover:text-primary transition-colors">
            <Image
              src="/logos/miller-ai-group.svg"
              alt="Miller AI Group"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            Miller AI Group
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">Projects</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/accomplishments">Accomplishments</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Enter System</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Hudson Barnes</h1>
            <p className="text-xl text-muted-foreground mb-4">
              {summary?.headline || 'Founder | Innovator'}
            </p>

            {/* Contact Info */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-6">
              {summary?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {summary.location}
                </span>
              )}
              {summary?.email && (
                <a href={`mailto:${summary.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Mail className="w-4 h-4" />
                  {summary.email}
                </a>
              )}
              {summary?.website && (
                <a href={summary.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Globe className="w-4 h-4" />
                  {summary.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <a href="/resume.pdf" download>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-4 h-4 mr-2" />
                  Instagram
                </a>
              </Button>
            </div>
          </div>

          {/* Summary */}
          {summary?.summary && (
            <Card className="mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {summary.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Resume Sections */}
          <div className="space-y-8">
            {sectionOrder.map((category) => {
              const categoryItems = groupedItems[category]
              if (!categoryItems || categoryItems.length === 0) return null

              const config = categoryConfig[category] || categoryConfig.achievement
              const Icon = config.icon

              return (
                <section key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold">{config.label}</h2>
                    <Badge variant="outline" className="ml-2">
                      {categoryItems.length}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {categoryItems.map((item) => (
                      <Card key={item.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              {(item.start_date || item.end_date || item.is_current) && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(item.start_date)}
                                  {(item.end_date || item.is_current) && ' - '}
                                  {item.is_current ? 'Present' : formatDate(item.end_date)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {item.description && (
                          <CardContent className="pt-0">
                            <CardDescription className="text-sm leading-relaxed whitespace-pre-wrap">
                              {item.description}
                            </CardDescription>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Connect Section */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>Let&apos;s Connect</CardTitle>
              <CardDescription>
                Interested in working together or learning more?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-4 h-4 mr-2" />
                    Connect on LinkedIn
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer">
                    <Instagram className="w-4 h-4 mr-2" />
                    Follow on Instagram
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
                {summary?.email && (
                  <Button asChild variant="outline">
                    <a href={`mailto:${summary.email}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Hudson Barnes. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

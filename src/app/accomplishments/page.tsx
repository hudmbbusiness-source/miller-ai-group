import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Award,
  ExternalLink,
  Calendar,
  ArrowLeft,
  Trophy,
  GraduationCap,
  Rocket,
  Code,
  Globe,
  Star,
  TrendingUp,
  Briefcase,
} from 'lucide-react'

interface Accomplishment {
  id: string
  title: string
  description: string | null
  category: string
  date: string | null
  link: string | null
  featured?: boolean
}

// Default accomplishments based on Hudson's real data
const DEFAULT_ACCOMPLISHMENTS: Accomplishment[] = [
  {
    id: '1',
    title: 'Founded Miller AI Group',
    description: 'Launched AI-focused venture studio building multiple products including Kachow (investor sentiment analysis), StuntMan AI (crypto trading), and BrainBox AI (intelligent notes).',
    category: 'startup',
    date: '2024-06-01',
    link: null,
    featured: true,
  },
  {
    id: '2',
    title: 'Admitted to BYU Marriott School of Business',
    description: 'Accepted into one of the top-ranked business schools in the United States, known for producing successful entrepreneurs and Fortune 500 executives.',
    category: 'education',
    date: '2024-09-01',
    link: null,
    featured: true,
  },
  {
    id: '3',
    title: 'Dual Degree: Business + Computer Science',
    description: 'Pursuing dual studies combining business acumen from Marriott School with technical expertise in Computer Science, positioning for tech entrepreneurship.',
    category: 'education',
    date: '2024-09-01',
    link: null,
    featured: true,
  },
  {
    id: '4',
    title: 'CEO of CozyFilmz',
    description: 'Led company as CEO, implementing strategic growth plans, negotiating partnerships, managing marketing campaigns, and organizing sponsor relationships.',
    category: 'leadership',
    date: '2025-01-01',
    link: null,
    featured: false,
  },
  {
    id: '5',
    title: 'Spanish Fluency Certification',
    description: 'Achieved certified fluency in Spanish, enabling bilingual business communication and expanding potential market reach to Spanish-speaking regions.',
    category: 'skill',
    date: '2022-05-01',
    link: null,
    featured: false,
  },
  {
    id: '6',
    title: 'High School Honor Roll',
    description: 'Graduated from Davis High School with 3.7 GPA and Honor Roll recognition in 2022, demonstrating consistent academic excellence.',
    category: 'education',
    date: '2022-05-01',
    link: null,
    featured: false,
  },
  {
    id: '7',
    title: 'Built Production AI Applications',
    description: 'Developed and deployed full-stack AI applications using Next.js, TypeScript, Supabase, and integrations with Groq, OpenAI, and Replicate APIs.',
    category: 'technical',
    date: '2024-10-01',
    link: null,
    featured: false,
  },
  {
    id: '8',
    title: 'Maintained 3.55 GPA at BYU',
    description: 'Maintaining strong academic performance while simultaneously building startups and managing multiple venture projects.',
    category: 'education',
    date: '2024-12-01',
    link: null,
    featured: false,
  },
]

const categoryConfig: Record<string, { label: string; icon: typeof Award; color: string }> = {
  startup: { label: 'Startup', icon: Rocket, color: 'text-purple-500' },
  education: { label: 'Education', icon: GraduationCap, color: 'text-blue-500' },
  leadership: { label: 'Leadership', icon: Briefcase, color: 'text-green-500' },
  skill: { label: 'Skill', icon: Globe, color: 'text-orange-500' },
  technical: { label: 'Technical', icon: Code, color: 'text-cyan-500' },
  achievement: { label: 'Achievement', icon: Trophy, color: 'text-yellow-500' },
  award: { label: 'Award', icon: Award, color: 'text-pink-500' },
}

export const metadata = {
  title: 'Accomplishments - Hudson Barnes',
  description: 'Key accomplishments and milestones in Hudson Barnes\' entrepreneurial and academic journey.',
}

export default async function AccomplishmentsPage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dbAccomplishments } = await (supabase.from('accomplishments') as any)
    .select('*')
    .eq('visible', true)
    .order('date', { ascending: false })

  // Use database accomplishments if available, otherwise use defaults
  const items = (dbAccomplishments && dbAccomplishments.length > 0
    ? dbAccomplishments
    : DEFAULT_ACCOMPLISHMENTS) as Accomplishment[]

  const featuredItems = items.filter(item => item.featured)
  const regularItems = items.filter(item => !item.featured)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold hover:text-primary transition-colors">
            Miller AI Group
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">Projects</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/resume">Resume</Link>
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

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Accomplishments</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Key milestones and achievements in my entrepreneurial and academic journey
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <Card>
              <CardContent className="pt-6 text-center">
                <Rocket className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">3+</p>
                <p className="text-sm text-muted-foreground">AI Ventures</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">3.55</p>
                <p className="text-sm text-muted-foreground">GPA at BYU</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-muted-foreground">Languages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-muted-foreground">CEO Role</p>
              </CardContent>
            </Card>
          </div>

          {/* Featured Accomplishments */}
          {featuredItems.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Featured Accomplishments
              </h2>
              <div className="grid gap-4">
                {featuredItems.map((item) => {
                  const config = categoryConfig[item.category] || categoryConfig.achievement
                  const Icon = config.icon
                  return (
                    <Card key={item.id} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Icon className={`w-6 h-6 ${config.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <CardTitle className="text-xl">{item.title}</CardTitle>
                              <Badge variant="outline" className={config.color}>
                                {config.label}
                              </Badge>
                            </div>
                            {item.date && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(item.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                })}
                              </div>
                            )}
                            {item.description && (
                              <CardDescription className="text-base">
                                {item.description}
                              </CardDescription>
                            )}
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2"
                              >
                                Learn More
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {/* Other Accomplishments */}
          {regularItems.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-6">All Accomplishments</h2>
              <div className="space-y-3">
                {regularItems.map((item) => {
                  const config = categoryConfig[item.category] || categoryConfig.achievement
                  const Icon = config.icon
                  return (
                    <Card key={item.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-medium">{item.title}</h3>
                              <Badge variant="outline" className={`text-xs ${config.color}`}>
                                {config.label}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.date && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(item.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {/* CTA */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>Want to Learn More?</CardTitle>
              <CardDescription>
                Check out my projects or download my full resume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/projects">
                    View Projects
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/resume">
                    View Resume
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="/resume.pdf" download>
                    Download PDF
                  </a>
                </Button>
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

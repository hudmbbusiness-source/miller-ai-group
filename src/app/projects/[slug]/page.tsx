import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROJECTS, SOCIAL_LINKS } from '@/types'
import { ChevronLeft, ChevronRight, Instagram, Linkedin, ExternalLink, Newspaper, Lightbulb, Globe } from 'lucide-react'

const statusColors: Record<string, string> = {
  'active': 'bg-green-500/10 text-green-500 border-green-500/20',
  'development': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'coming-soon': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'past': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const statusLabels: Record<string, string> = {
  'active': 'Active',
  'development': 'In Development',
  'coming-soon': 'Coming Soon',
  'past': 'Past Venture',
}

export function generateStaticParams() {
  return PROJECTS.map((project) => ({
    slug: project.slug,
  }))
}

export default async function ProjectDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params
  const project = PROJECTS.find((p) => p.slug === slug)

  if (!project) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
            Miller AI Group
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Button asChild variant="ghost" className="mb-8">
            <Link href="/projects">
              <ChevronLeft className="w-4 h-4 mr-2" />
              All Projects
            </Link>
          </Button>

          {/* Project Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              {project.logoPath && (
                <div className="w-16 h-16 rounded-xl bg-card border border-border overflow-hidden flex items-center justify-center">
                  <Image
                    src={project.logoPath}
                    alt={project.name}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-4xl font-bold">{project.name}</h1>
                  <Badge variant="outline" className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </div>
                <p className="text-xl text-muted-foreground">
                  {project.description}
                </p>
              </div>
            </div>
            {(project.website || project.instagram) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {project.website && (
                  <Button asChild variant="outline" size="sm">
                    <a href={project.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
                {project.instagram && (
                  <Button asChild variant="outline" size="sm">
                    <a href={project.instagram} target="_blank" rel="noopener noreferrer">
                      <Instagram className="w-4 h-4 mr-2" />
                      Follow on Instagram
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Project Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>About This Project</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {project.longDescription}
              </p>
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={statusColors[project.status]}>
                  {statusLabels[project.status]}
                </Badge>
                <span className="text-muted-foreground">
                  {project.status === 'active' && 'This project is live and actively maintained.'}
                  {project.status === 'development' && 'This project is currently under development.'}
                  {project.status === 'coming-soon' && 'This project is planned for future development.'}
                  {project.status === 'past' && 'This venture has concluded but provided valuable experience.'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Press Coverage */}
          {project.pressLinks && project.pressLinks.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5" />
                  Press Coverage
                </CardTitle>
                <CardDescription>
                  Media mentions and news articles about this venture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.pressLinks.map((article, index) => (
                    <a
                      key={index}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {article.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new URL(article.url).hostname.replace('www.', '')}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lessons Learned (for past ventures) */}
          {project.status === 'past' && (
            <Card className="mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Lessons Learned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    Real-world experience in entrepreneurship and business operations
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    Navigating complex real estate negotiations and lease agreements
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    Developing resilience and the ability to pivot under pressure
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    Building and leading teams toward a common vision
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    Understanding the importance of location and timing in business
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Access the Private Hub</h3>
                <p className="text-muted-foreground mb-4">
                  Login to access project integrations, detailed documentation, and administrative controls.
                </p>
                <Button asChild size="lg">
                  <Link href="/login">
                    Login to Access Hub
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Miller AI Group
            </p>
            <div className="flex items-center gap-4">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

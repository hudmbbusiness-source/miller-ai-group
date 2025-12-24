import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROJECTS, SOCIAL_LINKS } from '@/types'
import { ChevronRight, Instagram, Linkedin } from 'lucide-react'

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

export default function ProjectsPage() {
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
        <div className="max-w-5xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Projects</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore the innovative ventures and technology systems under development at Miller AI Group.
            </p>
          </div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {PROJECTS.map((project) => (
              <Card key={project.slug} className="group hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <Badge variant="outline" className={statusColors[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" className="group-hover:bg-primary/10">
                    <Link href={`/projects/${project.slug}`}>
                      Learn More
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Want to see project details and integrations?
            </p>
            <Button asChild size="lg">
              <Link href="/login">
                Login to Access Hub
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
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

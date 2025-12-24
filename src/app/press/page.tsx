import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROJECTS, SOCIAL_LINKS } from '@/types'
import { ChevronRight, Instagram, Linkedin, ExternalLink, Newspaper, Calendar } from 'lucide-react'

// Get all projects with press links
const projectsWithPress = PROJECTS.filter(p => p.pressLinks && p.pressLinks.length > 0)

// All press articles with project context
const allPressArticles = projectsWithPress.flatMap(project =>
  (project.pressLinks || []).map(link => ({
    ...link,
    projectName: project.name,
    projectSlug: project.slug,
    logoPath: project.logoPath,
  }))
)

export const metadata = {
  title: 'Press | Miller AI Group',
  description: 'Press coverage and media mentions of Miller AI Group ventures.',
}

export default function PressPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
            Miller AI Group
          </Link>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">Projects</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-6">
              <Newspaper className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Press & Media</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              News coverage and media mentions of ventures and initiatives by Miller AI Group.
            </p>
          </div>

          {/* Press Articles */}
          {allPressArticles.length > 0 ? (
            <div className="space-y-6">
              {projectsWithPress.map((project) => (
                <div key={project.slug} className="space-y-4">
                  {/* Project Header */}
                  <div className="flex items-center gap-4 pt-4">
                    {project.logoPath && (
                      <div className="w-12 h-12 rounded-lg bg-card border border-border overflow-hidden flex items-center justify-center">
                        <Image
                          src={project.logoPath}
                          alt={project.name}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold">{project.name}</h2>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-muted/50">
                      {project.status === 'past' ? 'Past Venture' : project.status}
                    </Badge>
                  </div>

                  {/* Articles for this project */}
                  <div className="grid gap-4">
                    {project.pressLinks?.map((article, index) => (
                      <Card key={index} className="group hover:border-primary/50 transition-all overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row">
                            {/* Article Image */}
                            {article.image && (
                              <div className="relative w-full sm:w-48 h-32 sm:h-auto shrink-0">
                                <Image
                                  src={article.image}
                                  alt={article.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            {/* Article Content */}
                            <div className="flex-1 p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                                    {article.title}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Newspaper className="w-4 h-4" />
                                      {article.source || new URL(article.url).hostname.replace('www.', '')}
                                    </span>
                                    {article.date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {article.date}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button asChild variant="outline" size="sm" className="shrink-0 hidden sm:inline-flex">
                                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                                    Read
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                  </a>
                                </Button>
                              </div>
                              <Button asChild variant="outline" size="sm" className="mt-4 sm:hidden w-full">
                                <a href={article.url} target="_blank" rel="noopener noreferrer">
                                  Read Article
                                  <ExternalLink className="w-4 h-4 ml-2" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Newspaper className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Press Coverage Yet</h3>
                <p className="text-muted-foreground text-center">
                  Press mentions and media coverage will appear here as ventures grow.
                </p>
              </CardContent>
            </Card>
          )}

          {/* CozyFilmz Story Section */}
          {projectsWithPress.find(p => p.slug === 'cozyfilmz') && (
            <Card className="mt-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  The CozyFilmz Story
                </CardTitle>
                <CardDescription>
                  A venture that provided invaluable entrepreneurial experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  CozyFilmz was a drive-in movie theater venture in Provo, Utah that brought the nostalgic
                  drive-in experience back to life. As CEO and Co-Founder, this venture taught important
                  lessons about entrepreneurship, real estate negotiations, operations management, and
                  the ability to pivot under pressure.
                </p>
                <p className="text-muted-foreground">
                  While the venture faced challenges with securing a permanent location, the experience
                  gained was invaluable for future entrepreneurial endeavors.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/projects/cozyfilmz">
                      View Project Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  {PROJECTS.find(p => p.slug === 'cozyfilmz')?.instagram && (
                    <Button asChild variant="ghost" size="sm">
                      <a
                        href={PROJECTS.find(p => p.slug === 'cozyfilmz')?.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="w-4 h-4 mr-2" />
                        Instagram
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Miller AI Group
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

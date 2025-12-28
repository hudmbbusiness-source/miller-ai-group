'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PROJECTS, SOCIAL_LINKS } from '@/types'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  Instagram,
  Linkedin,
  ExternalLink,
  Newspaper,
  Calendar,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'

// Stripe-style animated gradient mesh
function StripeMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[900px] h-[900px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 50%)',
          top: '-25%',
          left: '-10%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 80, 40, 0],
          y: [0, 40, 80, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
          bottom: '-15%',
          right: '-10%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -60, -30, 0],
          y: [0, -60, 30, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
    </div>
  )
}

// Get all projects with press links
const projectsWithPress = PROJECTS.filter(p => p.pressLinks && p.pressLinks.length > 0)

export default function PressPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased">
      <StripeMesh />

      {/* Navigation */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl border-b border-white/5" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/miller" className="flex items-center gap-3 group">
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/logos/miller-ai-group.svg"
                  alt="Miller AI Group"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </motion.div>
              <span className="font-semibold tracking-tight group-hover:text-violet-300 transition-colors">
                Miller AI Group
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="text-neutral-400 hover:text-white hover:bg-white/5">
                <Link href="/resume">Resume</Link>
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/25">
                  <Link href="/login">Login</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link
              href="/miller"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-xl mb-6"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Newspaper className="w-4 h-4 text-violet-400" />
              </motion.div>
              <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Press & Media</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                Press Coverage
              </span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto">
              News coverage and media mentions of ventures and initiatives by Miller AI Group.
            </p>
          </motion.div>

          {/* Press Articles */}
          {projectsWithPress.length > 0 ? (
            <div className="space-y-12">
              {projectsWithPress.map((project, projectIndex) => (
                <motion.div
                  key={project.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: projectIndex * 0.1 }}
                  className="space-y-6"
                >
                  {/* Project Header */}
                  <div className="flex items-center gap-4">
                    {project.logoPath && (
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-14 h-14 rounded-xl bg-neutral-900/80 border border-white/10 overflow-hidden flex items-center justify-center p-2"
                      >
                        <Image
                          src={project.logoPath}
                          alt={project.name}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </motion.div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                      <p className="text-sm text-neutral-500">{project.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-white/10 bg-white/5',
                        project.status === 'past' && 'border-neutral-500/30 text-neutral-400'
                      )}
                    >
                      {project.status === 'past' ? 'Past Venture' : project.status}
                    </Badge>
                  </div>

                  {/* Articles for this project */}
                  <div className="grid gap-4">
                    {project.pressLinks?.map((article, index) => (
                      <motion.a
                        key={index}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -2, scale: 1.01 }}
                        className={cn(
                          'group relative overflow-hidden rounded-2xl',
                          'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                          'backdrop-blur-xl border border-white/5',
                          'shadow-xl shadow-black/20',
                          'transition-all duration-300',
                          'hover:border-violet-500/20 hover:shadow-violet-500/5'
                        )}
                      >
                        <div className="flex flex-col sm:flex-row">
                          {article.image && (
                            <div className="relative w-full sm:w-52 h-36 sm:h-auto shrink-0 overflow-hidden">
                              <Image
                                src={article.image}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/50" />
                            </div>
                          )}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-2 text-white group-hover:text-violet-300 transition-colors">
                                  {article.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                                  <span className="flex items-center gap-1.5">
                                    <Newspaper className="w-4 h-4" />
                                    {article.source || new URL(article.url).hostname.replace('www.', '')}
                                  </span>
                                  {article.date && (
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4" />
                                      {article.date}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <motion.div
                                whileHover={{ x: 4 }}
                                className="hidden sm:flex items-center gap-2 text-sm text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Read
                                <ExternalLink className="w-4 h-4" />
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'relative overflow-hidden rounded-2xl p-12 text-center',
                'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                'backdrop-blur-xl border border-dashed border-white/10'
              )}
            >
              <Newspaper className="w-16 h-16 mx-auto text-neutral-700 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Press Coverage Yet</h3>
              <p className="text-neutral-500">
                Press mentions and media coverage will appear here as ventures grow.
              </p>
            </motion.div>
          )}

          {/* CozyFilmz Story Section */}
          {projectsWithPress.find(p => p.slug === 'cozyfilmz') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className={cn(
                'relative overflow-hidden rounded-2xl p-8 mt-16',
                'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10',
                'backdrop-blur-xl border border-violet-500/20'
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold">The CozyFilmz Story</h3>
                  <p className="text-sm text-neutral-500">A venture that provided invaluable entrepreneurial experience</p>
                </div>
              </div>
              <div className="space-y-4 text-neutral-400">
                <p>
                  CozyFilmz was a drive-in movie theater venture in Provo, Utah that brought the nostalgic
                  drive-in experience back to life. As CEO and Co-Founder, this venture taught important
                  lessons about entrepreneurship, real estate negotiations, operations management, and
                  the ability to pivot under pressure.
                </p>
                <p>
                  While the venture faced challenges with securing a permanent location, the experience
                  gained was invaluable for future entrepreneurial endeavors.
                </p>
              </div>
              <div className="flex gap-3 pt-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10">
                    <Link href="/projects/cozyfilmz">
                      View Project Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </motion.div>
                {PROJECTS.find(p => p.slug === 'cozyfilmz')?.instagram && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button asChild variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                      <a
                        href={PROJECTS.find(p => p.slug === 'cozyfilmz')?.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="w-4 h-4 mr-2" />
                        Instagram
                      </a>
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} Miller AI Group
            </p>
            <div className="flex items-center gap-4">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-neutral-500 hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-neutral-500 hover:text-white transition-colors"
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

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SOCIAL_LINKS } from '@/types'
import { cn } from '@/lib/utils'
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
  Calendar,
  Sparkles,
} from 'lucide-react'

// Stripe-style animated gradient mesh
function StripeMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[1000px] h-[1000px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
          top: '-30%',
          left: '-15%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 100, 50, 0],
          y: [0, 50, 100, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 50%)',
          top: '30%',
          right: '-20%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -80, -40, 0],
          y: [0, 80, 40, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
    </div>
  )
}

// Resume data
const summary = {
  headline: 'Founder & Entrepreneur | Business & Computer Science Student at BYU',
  summary: `Ambitious entrepreneur and student at Brigham Young University, pursuing dual studies in Business at the Marriott School of Business and Computer Science. Currently building multiple AI-powered ventures through Miller AI Group. Proven track record of leadership as former CEO of CozyFilmz, with experience in strategic planning, partnership negotiations, and brand development. Fluent in Spanish with a strong foundation in operational excellence and customer-focused decision making.`,
  location: 'Provo, Utah',
  email: 'Hudmbbusiness@gmail.com',
  phone: '(385)-405-5829',
  website: 'https://kachow.app/miller',
}

const resumeData = {
  education: [
    {
      title: 'Brigham Young University - Marriott School of Business',
      description: `Bachelor's in Business with Computer Science emphasis
• 3.55 GPA
• Marriott School of Business Student
• Spanish Fluent Certified
• Focus: Entrepreneurship, AI/ML, Software Engineering`,
      startDate: 'Sep 2024',
      endDate: null,
      isCurrent: true,
    },
    {
      title: 'Davis High School',
      description: `High School Diploma - Kaysville, UT
• 3.7 GPA
• Honor Roll 2022
• Strong foundation in academics and leadership`,
      startDate: 'Aug 2018',
      endDate: 'May 2022',
      isCurrent: false,
    },
  ],
  startup: [
    {
      title: 'Founder & CEO - Miller AI Group',
      description: `Leading AI-focused venture studio building multiple products:
• Kachow - AI video editing for YouTube monetization
• StuntMan AI - Cryptocurrency trading bot
• BrainBox AI - Intelligent note-taking with AI insights
• Building full-stack applications with Next.js, TypeScript, and AI integrations`,
      startDate: 'Jun 2024',
      endDate: null,
      isCurrent: true,
    },
  ],
  experience: [
    {
      title: 'CEO - CozyFilmz',
      description: `Led company operations and growth strategy
• Achieved company growth by implementing strategic plans and streamlining operations
• Managed and negotiated partnerships by creating contracts and deals
• Implemented cost-saving initiatives to increase company profits
• Marketed and advertised to achieve brand recognition
• Organized local sponsors to cover event costs and support the business`,
      startDate: 'Jan 2025',
      endDate: 'Jun 2025',
      isCurrent: false,
    },
    {
      title: 'Warehouse Worker - BadFlag',
      description: `Operations and logistics experience
• Loaded, unloaded and moved material to and from storage to production areas
• Maintained a clean workspace by enforcing housekeeping guidelines
• Reduced order processing time by implementing effective manufacturing and boxing techniques`,
      startDate: 'Sep 2019',
      endDate: 'Sep 2021',
      isCurrent: false,
    },
  ],
  skills: [
    {
      title: 'Technical Skills',
      items: ['Next.js', 'React', 'TypeScript', 'Node.js', 'Supabase', 'PostgreSQL', 'Vercel', 'AWS', 'Git', 'GitHub'],
    },
    {
      title: 'AI/ML',
      items: ['Groq', 'OpenAI', 'Anthropic', 'Replicate', 'LangChain'],
    },
    {
      title: 'Business & Leadership',
      items: ['Strategic Planning', 'Partnership Negotiations', 'Operations', 'Customer Focus', 'Decision Making'],
    },
    {
      title: 'Languages',
      items: ['English (Native)', 'Spanish (Fluent)'],
    },
  ],
  achievements: [
    { title: 'Founded Miller AI Group', description: 'Launched AI-focused venture studio with multiple products in development' },
    { title: 'BYU Marriott School of Business', description: 'Accepted into one of the top-ranked business schools in the nation' },
    { title: 'Spanish Fluency Certification', description: 'Achieved certified fluency enabling communication with Spanish-speaking partners' },
  ],
}

const categoryConfig: Record<string, { label: string; icon: typeof GraduationCap; gradient: string }> = {
  education: { label: 'Education', icon: GraduationCap, gradient: 'from-blue-500 to-cyan-500' },
  experience: { label: 'Experience', icon: Briefcase, gradient: 'from-emerald-500 to-green-500' },
  startup: { label: 'Ventures', icon: Rocket, gradient: 'from-violet-500 to-purple-500' },
  skills: { label: 'Skills', icon: Code2, gradient: 'from-amber-500 to-orange-500' },
  achievements: { label: 'Achievements', icon: Award, gradient: 'from-rose-500 to-pink-500' },
}

// Section component with animations
function Section({
  category,
  children,
  delay = 0,
}: {
  category: string
  children: React.ReactNode
  delay?: number
}) {
  const config = categoryConfig[category]
  const Icon = config?.icon || Award

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay }}
      className="relative"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 360 }}
          transition={{ duration: 0.5 }}
          className={cn(
            'p-2.5 rounded-xl bg-gradient-to-br shadow-lg',
            config?.gradient,
            'shadow-violet-500/20'
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-xl font-semibold tracking-tight">{config?.label}</h2>
      </div>
      {children}
    </motion.section>
  )
}

// Card component
function ResumeCard({
  title,
  description,
  startDate,
  endDate,
  isCurrent,
  index = 0,
}: {
  title: string
  description: string
  startDate?: string | null
  endDate?: string | null
  isCurrent?: boolean
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-6',
        'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
        'backdrop-blur-xl border border-white/5',
        'shadow-xl shadow-black/20',
        'transition-all duration-300',
        'hover:border-violet-500/20 hover:shadow-violet-500/5'
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {isCurrent && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            Current
          </Badge>
        )}
      </div>
      {(startDate || endDate || isCurrent) && (
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
          <Calendar className="w-4 h-4" />
          <span>
            {startDate} {(endDate || isCurrent) && '—'} {isCurrent ? 'Present' : endDate}
          </span>
        </div>
      )}
      <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">
        {description}
      </p>
    </motion.div>
  )
}

export default function ResumePage() {
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
                <Link href="/press">Press</Link>
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/25">
                  <Link href="/intro">Enter System</Link>
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
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Resume</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                Hudson Barnes
              </span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 mb-6 max-w-2xl mx-auto">
              {summary.headline}
            </p>

            {/* Contact Info */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-neutral-500 mb-8">
              <span className="flex items-center gap-2 hover:text-violet-400 transition-colors">
                <MapPin className="w-4 h-4" />
                {summary.location}
              </span>
              <a href={`mailto:${summary.email}`} className="flex items-center gap-2 hover:text-violet-400 transition-colors">
                <Mail className="w-4 h-4" />
                {summary.email}
              </a>
              <a href={summary.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-violet-400 transition-colors">
                <Globe className="w-4 h-4" />
                {summary.website.replace(/^https?:\/\//, '')}
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/25">
                  <a href="/resume.pdf" download>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20">
                  <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20">
                  <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer">
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </a>
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={cn(
              'relative overflow-hidden rounded-2xl p-6 mb-12',
              'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
              'backdrop-blur-xl border border-white/5',
              'shadow-xl'
            )}
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
              About
            </h3>
            <p className="text-neutral-400 leading-relaxed">
              {summary.summary}
            </p>
          </motion.div>

          {/* Resume Sections */}
          <div className="space-y-12">
            {/* Education */}
            <Section category="education" delay={0.1}>
              <div className="space-y-4">
                {resumeData.education.map((item, index) => (
                  <ResumeCard key={item.title} {...item} index={index} />
                ))}
              </div>
            </Section>

            {/* Ventures */}
            <Section category="startup" delay={0.15}>
              <div className="space-y-4">
                {resumeData.startup.map((item, index) => (
                  <ResumeCard key={item.title} {...item} index={index} />
                ))}
              </div>
            </Section>

            {/* Experience */}
            <Section category="experience" delay={0.2}>
              <div className="space-y-4">
                {resumeData.experience.map((item, index) => (
                  <ResumeCard key={item.title} {...item} index={index} />
                ))}
              </div>
            </Section>

            {/* Skills */}
            <Section category="skills" delay={0.25}>
              <div className="grid md:grid-cols-2 gap-4">
                {resumeData.skills.map((skill, index) => (
                  <motion.div
                    key={skill.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={cn(
                      'relative overflow-hidden rounded-2xl p-5',
                      'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                      'backdrop-blur-xl border border-white/5',
                      'shadow-xl'
                    )}
                  >
                    <h3 className="text-sm font-semibold text-neutral-300 mb-3">{skill.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {skill.items.map((item) => (
                        <Badge key={item} variant="secondary" className="bg-white/5 text-neutral-300 border-white/10 hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/30 transition-colors cursor-default">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Section>

            {/* Achievements */}
            <Section category="achievements" delay={0.3}>
              <div className="grid md:grid-cols-3 gap-4">
                {resumeData.achievements.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className={cn(
                      'relative overflow-hidden rounded-2xl p-5 text-center',
                      'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                      'backdrop-blur-xl border border-white/5',
                      'shadow-xl hover:border-violet-500/20 hover:shadow-violet-500/5',
                      'transition-all duration-300'
                    )}
                  >
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center"
                    >
                      <Award className="w-6 h-6 text-rose-400" />
                    </motion.div>
                    <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-neutral-500">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </Section>
          </div>

          {/* Connect Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={cn(
              'relative overflow-hidden rounded-2xl p-8 mt-16 text-center',
              'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10',
              'backdrop-blur-xl border border-violet-500/20',
              'shadow-xl'
            )}
          >
            <h3 className="text-2xl font-bold mb-3">
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Let&apos;s Connect
              </span>
            </h3>
            <p className="text-neutral-400 mb-6">
              Interested in working together or learning more?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
                  <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-4 h-4 mr-2" />
                    Connect on LinkedIn
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
                  <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer">
                    <Instagram className="w-4 h-4 mr-2" />
                    Follow on Instagram
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
                  <a href={`mailto:${summary.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </a>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm text-neutral-500">
            © {new Date().getFullYear()} Hudson Barnes. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

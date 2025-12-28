'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FileText,
  Grid3X3,
  Link2,
  FolderOpen,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const statIcons: Record<string, typeof FileText> = {
  'Notes': FileText,
  'Boards': Grid3X3,
  'Links': Link2,
  'Files': FolderOpen,
}

const statColors: Record<string, { bg: string; icon: string; glow: string }> = {
  'Notes': {
    bg: 'from-violet-500/10 to-violet-500/5',
    icon: 'from-violet-500 to-purple-600',
    glow: 'group-hover:shadow-violet-500/25',
  },
  'Boards': {
    bg: 'from-cyan-500/10 to-cyan-500/5',
    icon: 'from-cyan-400 to-blue-500',
    glow: 'group-hover:shadow-cyan-500/25',
  },
  'Links': {
    bg: 'from-amber-500/10 to-amber-500/5',
    icon: 'from-amber-400 to-orange-500',
    glow: 'group-hover:shadow-amber-500/25',
  },
  'Files': {
    bg: 'from-emerald-500/10 to-emerald-500/5',
    icon: 'from-emerald-400 to-green-500',
    glow: 'group-hover:shadow-emerald-500/25',
  },
}

interface StatCardData {
  label: string
  count: number
  href: string
}

interface AnimatedDashboardHeaderProps {
  title: string
  subtitle: string
}

export function AnimatedDashboardHeader({ title, subtitle }: AnimatedDashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground mt-1">{subtitle}</p>
    </motion.div>
  )
}

export function AnimatedStatCards({ stats }: { stats: StatCardData[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      {stats.map((stat, index) => {
        const Icon = statIcons[stat.label] || FileText
        const colors = statColors[stat.label] || statColors['Notes']

        return (
          <motion.div key={stat.label} variants={itemVariants}>
            <Link href={stat.href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'group relative overflow-hidden rounded-2xl p-5 h-full cursor-pointer',
                  'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl',
                  'border border-border/50 hover:border-violet-500/30',
                  'transition-all duration-300',
                  'shadow-lg hover:shadow-xl',
                  colors.glow
                )}
              >
                {/* Background gradient */}
                <div className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  'bg-gradient-to-br',
                  colors.bg
                )} />

                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
                      {stat.label}
                    </span>
                    <motion.div
                      whileHover={{ rotate: 45 }}
                      className={cn(
                        'p-2 rounded-xl bg-gradient-to-br shadow-lg',
                        colors.icon
                      )}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>

                  <div className="flex items-end justify-between">
                    <motion.span
                      className="text-3xl sm:text-4xl font-bold"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 + index * 0.1, type: 'spring', stiffness: 200 }}
                    >
                      {stat.count}
                    </motion.span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-violet-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

interface SectionHeaderProps {
  title: string
  icon?: React.ReactNode
  className?: string
}

export function AnimatedSectionHeader({ title, icon, className }: SectionHeaderProps) {
  return (
    <motion.h2
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        'text-lg sm:text-xl font-semibold flex items-center gap-2',
        className
      )}
    >
      {icon}
      <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </span>
    </motion.h2>
  )
}

export function AnimatedCard({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -2 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl',
        'border border-border/50 hover:border-violet-500/20',
        'transition-all duration-300',
        'shadow-lg hover:shadow-xl',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedQuickActions({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3"
    >
      {children}
    </motion.div>
  )
}

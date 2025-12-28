'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardAnimatedProps {
  title: string
  value: number
  suffix?: string
  prefix?: string
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'amber' | 'blue' | 'purple' | 'green' | 'red'
  delay?: number
  className?: string
}

const colorMap = {
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    border: 'group-hover:border-amber-500/50',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    border: 'group-hover:border-blue-500/50',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]',
    border: 'group-hover:border-purple-500/50',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    glow: 'group-hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]',
    border: 'group-hover:border-green-500/50',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    glow: 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    border: 'group-hover:border-red-500/50',
  },
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [hasAnimated, setHasAnimated] = useState(false)

  const spring = useSpring(0, {
    mass: 1,
    stiffness: 75,
    damping: 15,
  })

  const display = useTransform(spring, (current) => Math.round(current))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest)
    })
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timeout = setTimeout(() => {
        spring.set(value)
        setHasAnimated(true)
      }, delay * 1000)
      return () => clearTimeout(timeout)
    }
  }, [isInView, hasAnimated, spring, value, delay])

  return <span ref={ref}>{displayValue}</span>
}

export function StatCardAnimated({
  title,
  value,
  suffix = '',
  prefix = '',
  icon: Icon,
  description,
  trend,
  color = 'amber',
  delay = 0,
  className,
}: StatCardAnimatedProps) {
  const colors = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-card/50 backdrop-blur-xl',
        'border border-border/50',
        'transition-all duration-300',
        colors.glow,
        colors.border,
        className
      )}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      {/* Inner glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={cn(
          'absolute -top-1/2 -right-1/2 w-full h-full rounded-full blur-3xl',
          colors.bg,
          'opacity-30'
        )} />
      </div>

      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                {prefix}
                <AnimatedNumber value={value} delay={delay} />
                {suffix}
              </span>
              {trend && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.3 }}
                  className={cn(
                    'text-xs font-medium ml-2 px-1.5 py-0.5 rounded',
                    trend.isPositive
                      ? 'text-green-500 bg-green-500/10'
                      : 'text-red-500 bg-red-500/10'
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </motion.span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: delay + 0.1,
            }}
            className={cn(
              'p-3 rounded-xl',
              colors.bg,
              'transition-transform duration-300',
              'group-hover:scale-110'
            )}
          >
            <Icon className={cn('w-5 h-5', colors.text)} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

// Grid wrapper with stagger animation
export function StatCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={cn('grid gap-4', className)}
    >
      {children}
    </motion.div>
  )
}

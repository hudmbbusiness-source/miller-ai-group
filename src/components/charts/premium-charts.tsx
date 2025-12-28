'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

// Premium color palette
const colors = {
  primary: {
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    solid: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  secondary: {
    gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
    solid: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.5)',
  },
  accent: {
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    solid: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.5)',
  },
  success: {
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    solid: '#10b981',
    glow: 'rgba(16, 185, 129, 0.5)',
  },
}

// ============================================
// ANIMATED NUMBER COUNTER
// ============================================
interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedNumber({
  value,
  duration = 1.5,
  className,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const spring = useSpring(0, { duration: duration * 1000 })
  const display = useTransform(spring, (v) => Math.round(v))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v))
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, spring, value])

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

// ============================================
// PREMIUM PROGRESS RING
// ============================================
interface PremiumProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  colorScheme?: 'primary' | 'secondary' | 'accent' | 'success'
  className?: string
}

export function PremiumProgressRing({
  value,
  size = 180,
  strokeWidth = 12,
  label,
  sublabel,
  colorScheme = 'primary',
  className,
}: PremiumProgressRingProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const color = colors[colorScheme]

  return (
    <div ref={ref} className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Glow filter */}
        <defs>
          <linearGradient id={`gradient-${colorScheme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorScheme === 'primary' ? '#8b5cf6' : colorScheme === 'secondary' ? '#3b82f6' : colorScheme === 'accent' ? '#f59e0b' : '#10b981'} />
            <stop offset="50%" stopColor={colorScheme === 'primary' ? '#a855f7' : colorScheme === 'secondary' ? '#6366f1' : colorScheme === 'accent' ? '#f97316' : '#14b8a6'} />
            <stop offset="100%" stopColor={colorScheme === 'primary' ? '#d946ef' : colorScheme === 'secondary' ? '#8b5cf6' : colorScheme === 'accent' ? '#ef4444' : '#06b6d4'} />
          </linearGradient>
          <filter id={`glow-${colorScheme}`}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />

        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${colorScheme})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={isInView ? { strokeDashoffset: circumference - (value / 100) * circumference } : {}}
          transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
          filter={`url(#glow-${colorScheme})`}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold tracking-tight"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <AnimatedNumber value={value} />
        </motion.span>
        {label && (
          <motion.span
            className="text-sm font-medium text-muted-foreground mt-1"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 }}
          >
            {label}
          </motion.span>
        )}
        {sublabel && (
          <motion.span
            className="text-xs text-muted-foreground/70"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8 }}
          >
            {sublabel}
          </motion.span>
        )}
      </div>
    </div>
  )
}

// ============================================
// PREMIUM BAR CHART
// ============================================
interface BarData {
  label: string
  value: number
  color?: string
}

interface PremiumBarChartProps {
  data: BarData[]
  height?: number
  showValues?: boolean
  showLabels?: boolean
  animated?: boolean
  className?: string
}

export function PremiumBarChart({
  data,
  height = 200,
  showValues = true,
  showLabels = true,
  animated = true,
  className,
}: PremiumBarChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  const defaultColors = [
    'from-violet-500 to-purple-600',
    'from-cyan-400 to-blue-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-green-500',
    'from-rose-400 to-pink-500',
    'from-indigo-400 to-violet-500',
    'from-teal-400 to-cyan-500',
  ]

  return (
    <div ref={ref} className={cn('w-full', className)} style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2 sm:gap-4">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100
          const colorClass = item.color || defaultColors[index % defaultColors.length]

          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-2 h-full">
              {/* Value label */}
              {showValues && (
                <motion.span
                  className="text-sm font-semibold text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  {item.value}
                </motion.span>
              )}

              {/* Bar container */}
              <div className="flex-1 w-full flex items-end">
                <motion.div
                  className={cn(
                    'w-full rounded-t-lg bg-gradient-to-t relative overflow-hidden',
                    colorClass
                  )}
                  initial={{ height: 0 }}
                  animate={isInView ? { height: `${barHeight}%` } : {}}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.1,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  style={{ minHeight: item.value > 0 ? 8 : 0 }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={isInView ? { x: '200%' } : {}}
                    transition={{
                      duration: 1,
                      delay: index * 0.1 + 0.5,
                      ease: 'easeInOut',
                    }}
                  />
                </motion.div>
              </div>

              {/* Label */}
              {showLabels && (
                <motion.span
                  className="text-xs text-muted-foreground font-medium truncate max-w-full"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {item.label}
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// PREMIUM AREA CHART
// ============================================
interface AreaData {
  label: string
  value: number
}

interface PremiumAreaChartProps {
  data: AreaData[]
  height?: number
  colorScheme?: 'primary' | 'secondary' | 'accent' | 'success'
  showDots?: boolean
  className?: string
}

export function PremiumAreaChart({
  data,
  height = 200,
  colorScheme = 'primary',
  showDots = true,
  className,
}: PremiumAreaChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const padding = 20

  const color = colors[colorScheme]
  const width = 100 // percentage based
  const chartHeight = height - padding * 2

  // Generate path
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.value / maxValue) * 100,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L 100 100 L 0 100 Z`

  return (
    <div ref={ref} className={cn('w-full relative', className)} style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={`area-gradient-${colorScheme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color.solid} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color.solid} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`line-gradient-${colorScheme}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorScheme === 'primary' ? '#8b5cf6' : colorScheme === 'secondary' ? '#3b82f6' : colorScheme === 'accent' ? '#f59e0b' : '#10b981'} />
            <stop offset="100%" stopColor={colorScheme === 'primary' ? '#d946ef' : colorScheme === 'secondary' ? '#8b5cf6' : colorScheme === 'accent' ? '#ef4444' : '#06b6d4'} />
          </linearGradient>
          <filter id="glow-line">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill={`url(#area-gradient-${colorScheme})`}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={`url(#line-gradient-${colorScheme})`}
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow-line)"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />

        {/* Dots */}
        {showDots && points.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="1.5"
            fill={color.solid}
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
          />
        ))}
      </svg>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================
// PREMIUM STAT CARD
// ============================================
interface PremiumStatCardProps {
  title: string
  value: number
  suffix?: string
  prefix?: string
  icon: LucideIcon
  trend?: { value: number; isPositive: boolean }
  description?: string
  colorScheme?: 'primary' | 'secondary' | 'accent' | 'success'
  delay?: number
  className?: string
}

export function PremiumStatCard({
  title,
  value,
  suffix = '',
  prefix = '',
  icon: Icon,
  trend,
  description,
  colorScheme = 'primary',
  delay = 0,
  className,
}: PremiumStatCardProps) {
  const color = colors[colorScheme]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-6',
        'bg-gradient-to-br from-card/80 to-card/40',
        'backdrop-blur-xl border border-border/50',
        'shadow-lg shadow-black/5',
        'hover:shadow-xl hover:shadow-black/10',
        'hover:border-border',
        'transition-all duration-300',
        className
      )}
    >
      {/* Gradient accent line */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-80',
        color.gradient
      )} />

      {/* Hover glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{ backgroundColor: color.solid }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold tracking-tight">
              {prefix}
              <AnimatedNumber value={value} duration={1} />
              {suffix}
            </span>
            {trend && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.3 }}
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  trend.isPositive
                    ? 'text-emerald-600 bg-emerald-500/10'
                    : 'text-rose-600 bg-rose-500/10'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </motion.span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
          className={cn(
            'p-3 rounded-xl bg-gradient-to-br',
            color.gradient,
            'shadow-lg'
          )}
          style={{ boxShadow: `0 8px 32px ${color.glow}` }}
        >
          <Icon className="w-5 h-5 text-white" />
        </motion.div>
      </div>
    </motion.div>
  )
}

// ============================================
// PREMIUM DONUT CHART
// ============================================
interface DonutSegment {
  name: string
  value: number
  color: string
}

interface PremiumDonutChartProps {
  data: DonutSegment[]
  size?: number
  strokeWidth?: number
  centerValue?: string | number
  centerLabel?: string
  className?: string
}

export function PremiumDonutChart({
  data,
  size = 200,
  strokeWidth = 24,
  centerValue,
  centerLabel,
  className,
}: PremiumDonutChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let cumulativePercent = 0

  return (
    <div ref={ref} className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <filter id="donut-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/10"
        />

        {/* Segments */}
        {data.map((segment, index) => {
          const percent = segment.value / total
          const offset = cumulativePercent * circumference
          const length = percent * circumference
          cumulativePercent += percent

          return (
            <motion.circle
              key={segment.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              filter="url(#donut-glow)"
              initial={{ opacity: 0, strokeDasharray: `0 ${circumference}` }}
              animate={isInView ? {
                opacity: 1,
                strokeDasharray: `${length} ${circumference - length}`,
              } : {}}
              transition={{
                duration: 1,
                delay: index * 0.15,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            />
          )
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerValue !== undefined && (
          <motion.span
            className="text-3xl font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            {typeof centerValue === 'number' ? (
              <AnimatedNumber value={centerValue} />
            ) : centerValue}
          </motion.span>
        )}
        {centerLabel && (
          <motion.span
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 }}
          >
            {centerLabel}
          </motion.span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((segment, index) => (
          <motion.div
            key={segment.name}
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: segment.color, boxShadow: `0 0 8px ${segment.color}60` }}
            />
            <span className="text-xs text-muted-foreground">{segment.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// PREMIUM METRIC ROW
// ============================================
interface MetricItem {
  label: string
  value: number
  suffix?: string
  color: string
}

interface PremiumMetricRowProps {
  items: MetricItem[]
  className?: string
}

export function PremiumMetricRow({ items, className }: PremiumMetricRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} className={cn('grid gap-4', className)} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          className="text-center p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: item.color }}
          >
            <AnimatedNumber value={item.value} suffix={item.suffix} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
        </motion.div>
      ))}
    </div>
  )
}

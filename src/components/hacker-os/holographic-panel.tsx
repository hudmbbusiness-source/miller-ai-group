'use client'

import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAudioEngine } from './audio-engine'

interface HolographicPanelProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'cyan' | 'green' | 'purple' | 'amber'
  glowIntensity?: 'low' | 'medium' | 'high'
  animated?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
  onClick?: () => void
}

const variantStyles = {
  default: {
    border: 'border-cyan-500/30',
    glow: 'rgba(0, 255, 255, 0.15)',
    glowHover: 'rgba(0, 255, 255, 0.3)',
    accent: 'bg-cyan-500',
    text: 'text-cyan-400',
  },
  cyan: {
    border: 'border-cyan-500/30',
    glow: 'rgba(0, 255, 255, 0.15)',
    glowHover: 'rgba(0, 255, 255, 0.3)',
    accent: 'bg-cyan-500',
    text: 'text-cyan-400',
  },
  green: {
    border: 'border-green-500/30',
    glow: 'rgba(0, 255, 65, 0.15)',
    glowHover: 'rgba(0, 255, 65, 0.3)',
    accent: 'bg-green-500',
    text: 'text-green-400',
  },
  purple: {
    border: 'border-purple-500/30',
    glow: 'rgba(191, 0, 255, 0.15)',
    glowHover: 'rgba(191, 0, 255, 0.3)',
    accent: 'bg-purple-500',
    text: 'text-purple-400',
  },
  amber: {
    border: 'border-amber-500/30',
    glow: 'rgba(255, 191, 0, 0.15)',
    glowHover: 'rgba(255, 191, 0, 0.3)',
    accent: 'bg-amber-500',
    text: 'text-amber-400',
  },
}

const glowIntensities = {
  low: { blur: '20px', spread: '5px' },
  medium: { blur: '40px', spread: '10px' },
  high: { blur: '60px', spread: '20px' },
}

export function HolographicPanel({
  children,
  className,
  variant = 'default',
  glowIntensity = 'medium',
  animated = true,
  header,
  footer,
  onClick,
}: HolographicPanelProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [scanlinePosition, setScanlinePosition] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const styles = variantStyles[variant]
  const glow = glowIntensities[glowIntensity]

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  // Scanline animation
  useEffect(() => {
    if (!animated) return

    const interval = setInterval(() => {
      setScanlinePosition(prev => (prev + 1) % 100)
    }, 50)

    return () => clearInterval(interval)
  }, [animated])

  const handleMouseEnter = () => {
    setIsHovered(true)
    audioEngine?.playEffect('button_hover')
  }

  const handleClick = () => {
    audioEngine?.playEffect('button_click')
    onClick?.()
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden rounded-lg',
        'bg-black/60 backdrop-blur-xl',
        'border',
        styles.border,
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        boxShadow: `0 0 ${glow.blur} ${glow.spread} ${isHovered ? styles.glowHover : styles.glow}`,
      }}
    >
      {/* Corner accents */}
      <div className={cn('absolute top-0 left-0 w-4 h-px', styles.accent)} />
      <div className={cn('absolute top-0 left-0 h-4 w-px', styles.accent)} />
      <div className={cn('absolute top-0 right-0 w-4 h-px', styles.accent)} />
      <div className={cn('absolute top-0 right-0 h-4 w-px', styles.accent)} />
      <div className={cn('absolute bottom-0 left-0 w-4 h-px', styles.accent)} />
      <div className={cn('absolute bottom-0 left-0 h-4 w-px', styles.accent)} />
      <div className={cn('absolute bottom-0 right-0 w-4 h-px', styles.accent)} />
      <div className={cn('absolute bottom-0 right-0 h-4 w-px', styles.accent)} />

      {/* Scanline effect */}
      {animated && (
        <div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          style={{
            top: `${scanlinePosition}%`,
            opacity: 0.5,
          }}
        />
      )}

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Glitch line on hover */}
      {isHovered && animated && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.2 }}
          className={cn('absolute top-0 left-0 right-0 h-px', styles.accent)}
          style={{ opacity: 0.8 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {header && (
          <div className={cn('px-4 py-3 border-b border-white/5', styles.text)}>
            {header}
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 border-t border-white/5">
            {footer}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Stat display variant
interface HolographicStatProps {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: 'default' | 'cyan' | 'green' | 'purple' | 'amber'
  icon?: React.ReactNode
}

export function HolographicStat({
  label,
  value,
  trend,
  trendValue,
  variant = 'cyan',
  icon,
}: HolographicStatProps) {
  const styles = variantStyles[variant]

  return (
    <HolographicPanel variant={variant} glowIntensity="low" className="min-w-[160px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">{label}</p>
          <p className={cn('text-2xl font-bold font-mono', styles.text)}>{value}</p>
          {trend && trendValue && (
            <p className={cn(
              'text-xs mt-1 flex items-center gap-1',
              trend === 'up' && 'text-green-400',
              trend === 'down' && 'text-red-400',
              trend === 'neutral' && 'text-neutral-400'
            )}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'neutral' && '→'}
              {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2 rounded-lg bg-white/5', styles.text)}>
            {icon}
          </div>
        )}
      </div>
    </HolographicPanel>
  )
}

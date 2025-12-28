'use client'

import { motion } from 'framer-motion'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useAudioEngine } from './audio-engine'

interface GlitchButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
  glitchOnHover?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles = {
  primary: {
    base: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400',
    hover: 'hover:bg-cyan-500/20 hover:border-cyan-400',
    glow: '0 0 30px rgba(0, 255, 255, 0.4)',
    glowColor: 'rgba(0, 255, 255, 0.6)',
  },
  secondary: {
    base: 'bg-white/5 border-white/20 text-white',
    hover: 'hover:bg-white/10 hover:border-white/40',
    glow: '0 0 20px rgba(255, 255, 255, 0.2)',
    glowColor: 'rgba(255, 255, 255, 0.4)',
  },
  danger: {
    base: 'bg-red-500/10 border-red-500/50 text-red-400',
    hover: 'hover:bg-red-500/20 hover:border-red-400',
    glow: '0 0 30px rgba(255, 0, 0, 0.4)',
    glowColor: 'rgba(255, 0, 0, 0.6)',
  },
  ghost: {
    base: 'bg-transparent border-transparent text-neutral-400',
    hover: 'hover:bg-white/5 hover:text-white',
    glow: 'none',
    glowColor: 'transparent',
  },
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
}

export function GlitchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  glitchOnHover = true,
  type = 'button',
}: GlitchButtonProps) {
  const [isGlitching, setIsGlitching] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const styles = variantStyles[variant]

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  const triggerGlitch = useCallback(() => {
    if (!glitchOnHover) return
    setIsGlitching(true)
    setTimeout(() => setIsGlitching(false), 150)
  }, [glitchOnHover])

  const handleMouseEnter = () => {
    setIsHovered(true)
    triggerGlitch()
    audioEngine?.playEffect('button_hover')
  }

  const handleClick = () => {
    if (disabled || loading) return
    audioEngine?.playEffect('button_click')
    triggerGlitch()
    onClick?.()
  }

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative overflow-hidden rounded-md border font-medium',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-black',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        styles.base,
        !disabled && styles.hover,
        sizeStyles[size],
        className
      )}
      style={{
        boxShadow: isHovered && !disabled ? styles.glow : 'none',
      }}
    >
      {/* Glitch layers */}
      {isGlitching && (
        <>
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: 'translateX(-2px)',
              color: '#ff0000',
              opacity: 0.7,
              clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
            }}
          >
            {children}
          </span>
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: 'translateX(2px)',
              color: '#00ffff',
              opacity: 0.7,
              clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
            }}
          >
            {children}
          </span>
        </>
      )}

      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />

      {/* Neon edge pulse on hover */}
      {isHovered && !disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            boxShadow: `inset 0 0 10px ${styles.glowColor}`,
          }}
        />
      )}

      {/* Content */}
      <span className={cn(
        'relative z-10 flex items-center justify-center gap-2',
        loading && 'opacity-0'
      )}>
        {children}
      </span>

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
          />
        </div>
      )}
    </motion.button>
  )
}

// Icon button variant
interface GlitchIconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  label: string
  className?: string
}

const iconSizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

export function GlitchIconButton({
  icon,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  label,
  className,
}: GlitchIconButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const styles = variantStyles[variant]

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  const handleClick = () => {
    if (disabled) return
    audioEngine?.playEffect('button_click')
    onClick?.()
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={() => { setIsHovered(true); audioEngine?.playEffect('button_hover') }}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      className={cn(
        'relative rounded-lg border flex items-center justify-center',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        styles.base,
        !disabled && styles.hover,
        iconSizeStyles[size],
        className
      )}
      style={{
        boxShadow: isHovered && !disabled ? styles.glow : 'none',
      }}
    >
      {icon}
    </motion.button>
  )
}

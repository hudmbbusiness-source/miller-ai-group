// =============================================================================
// STUNTMAN AI - LOGO COMPONENT
// =============================================================================
// Modern, dynamic logo with gradient and animations
// =============================================================================

'use client'

import { motion } from 'framer-motion'

interface StuntManLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  animated?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 32, text: 'text-lg' },
  md: { icon: 40, text: 'text-xl' },
  lg: { icon: 56, text: 'text-2xl' },
  xl: { icon: 80, text: 'text-4xl' },
}

export function StuntManLogo({
  size = 'md',
  showText = true,
  animated = true,
  className = ''
}: StuntManLogoProps) {
  const { icon, text } = sizes[size]

  const iconContent = (
    <div
      className="relative flex items-center justify-center rounded-xl overflow-hidden"
      style={{ width: icon, height: icon }}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600" />

      {/* Animated Pulse Ring */}
      {animated && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-emerald-300 to-teal-500 rounded-xl"
          animate={{
            opacity: [0.5, 0.2, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Lightning Bolt Icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative z-10"
        style={{ width: icon * 0.55, height: icon * 0.55 }}
      >
        <path
          d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
          fill="white"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
    </div>
  )

  if (!showText) {
    return animated ? (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={className}
      >
        {iconContent}
      </motion.div>
    ) : (
      <div className={className}>{iconContent}</div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {animated ? (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {iconContent}
        </motion.div>
      ) : (
        iconContent
      )}
      <div className="flex flex-col">
        <span className={`font-bold ${text} tracking-tight`}>
          <span className="text-white">Stunt</span>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Man</span>
        </span>
        <span className="text-xs text-zinc-500 font-medium tracking-wide">AI TRADING</span>
      </div>
    </div>
  )
}

// Minimal version for nav/header
export function StuntManLogoMini({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path
            d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
            fill="white"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="font-bold text-lg">
        <span className="text-white">Stunt</span>
        <span className="text-emerald-400">Man</span>
      </span>
    </div>
  )
}

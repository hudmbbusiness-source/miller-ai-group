'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

// ============================================
// CHARACTER DATA - Stylized as encrypted operatives
// ============================================
interface CharacterData {
  id: string
  name: string
  codename: string
  classification: string
  color: string
  secondaryColor: string
  signature: string
  role: string
}

export const CHARACTERS: CharacterData[] = [
  {
    id: 'wick',
    name: 'ENCRYPTED OPERATIVE',
    codename: 'W.I.C.K',
    classification: 'LEVEL-5 CLEARANCE',
    color: '#ff0040',
    secondaryColor: '#ff4d4d',
    signature: 'PROTOCOL: ELIMINATION',
    role: 'SECURITY OVERRIDE'
  },
  {
    id: 'bart',
    name: 'CHAOS AGENT',
    codename: 'B.A.R.T',
    classification: 'UNAUTHORIZED ACCESS',
    color: '#ffd700',
    secondaryColor: '#ffed4a',
    signature: 'SYSTEM COMPROMISED',
    role: 'FIREWALL BYPASS'
  },
  {
    id: 'joker',
    name: 'UNKNOWN ENTITY',
    codename: 'J.O.K.E.R',
    classification: 'THREAT LEVEL: CRITICAL',
    color: '#9d00ff',
    secondaryColor: '#bf00ff',
    signature: 'CHAOS PROTOCOL ACTIVE',
    role: 'AUTHENTICATION BYPASS'
  },
  {
    id: 'wolf',
    name: 'HIGH-RISK INTRUDER',
    codename: 'W.O.L.F',
    classification: 'FINANCIAL SECTOR',
    color: '#00ff41',
    secondaryColor: '#4dff7c',
    signature: 'ACQUISITION COMPLETE',
    role: 'DATA EXTRACTION'
  },
  {
    id: 'margot',
    name: 'PHANTOM ACCESS',
    codename: 'M.R.O.B',
    classification: 'ENCRYPTED PRESENCE',
    color: '#ff1493',
    secondaryColor: '#ff69b4',
    signature: 'PROCEED TO BREACH',
    role: 'SYSTEM INFILTRATION'
  },
]

// ============================================
// HOLOGRAPHIC SILHOUETTE - Main component
// ============================================
interface SilhouetteProps {
  character: CharacterData
  action?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'static' | 'glitch' | 'scan' | 'materialize'
}

export function HolographicSilhouette({
  character,
  action,
  size = 'medium',
  variant = 'static'
}: SilhouetteProps) {
  const [glitchActive, setGlitchActive] = useState(false)

  const sizeClasses = {
    small: 'w-24 h-32',
    medium: 'w-40 h-52',
    large: 'w-56 h-72'
  }

  // Random glitch effect
  useEffect(() => {
    if (variant === 'glitch') {
      const interval = setInterval(() => {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), 100)
      }, 2000 + Math.random() * 2000)
      return () => clearInterval(interval)
    }
  }, [variant])

  return (
    <motion.div
      className={`relative ${sizeClasses[size]}`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${character.color}20 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Scanning lines */}
      {variant === 'scan' && (
        <motion.div
          className="absolute inset-0 overflow-hidden rounded-lg"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 4px,
              ${character.color}10 4px,
              ${character.color}10 5px
            )`,
          }}
          animate={{ y: ['0%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Silhouette body - Abstract humanoid shape */}
      <svg
        viewBox="0 0 100 140"
        className="w-full h-full"
        style={{
          filter: `drop-shadow(0 0 15px ${character.color}) ${glitchActive ? 'hue-rotate(90deg)' : ''}`,
        }}
      >
        {/* Outer glow layer */}
        <defs>
          <linearGradient id={`grad-${character.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={character.color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={character.secondaryColor} stopOpacity="0.2" />
          </linearGradient>
          <filter id={`glow-${character.id}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Abstract head */}
        <motion.ellipse
          cx="50"
          cy="25"
          rx="18"
          ry="22"
          fill="none"
          stroke={`url(#grad-${character.id})`}
          strokeWidth="1.5"
          filter={`url(#glow-${character.id})`}
          animate={glitchActive ? { cx: [50, 52, 48, 50] } : {}}
        />

        {/* Face features - abstract lines */}
        <motion.line
          x1="42"
          y1="20"
          x2="48"
          y2="20"
          stroke={character.color}
          strokeWidth="2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.line
          x1="52"
          y1="20"
          x2="58"
          y2="20"
          stroke={character.color}
          strokeWidth="2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />

        {/* Body outline */}
        <motion.path
          d="M 50 47 L 30 70 L 25 110 L 35 110 L 40 85 L 50 95 L 60 85 L 65 110 L 75 110 L 70 70 Z"
          fill="none"
          stroke={`url(#grad-${character.id})`}
          strokeWidth="1.5"
          filter={`url(#glow-${character.id})`}
          animate={glitchActive ? { d: [
            "M 50 47 L 30 70 L 25 110 L 35 110 L 40 85 L 50 95 L 60 85 L 65 110 L 75 110 L 70 70 Z",
            "M 52 47 L 28 70 L 25 110 L 35 110 L 40 85 L 50 95 L 60 85 L 65 110 L 75 110 L 72 70 Z",
            "M 50 47 L 30 70 L 25 110 L 35 110 L 40 85 L 50 95 L 60 85 L 65 110 L 75 110 L 70 70 Z",
          ]} : {}}
          transition={{ duration: 0.1 }}
        />

        {/* Arms - abstract */}
        <motion.path
          d="M 30 60 L 15 80 M 70 60 L 85 80"
          fill="none"
          stroke={character.color}
          strokeWidth="1.5"
          strokeOpacity="0.7"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Data particles around figure */}
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={i}
            cx={50 + Math.cos(i * (Math.PI / 4)) * 40}
            cy={60 + Math.sin(i * (Math.PI / 4)) * 30}
            r="1.5"
            fill={character.color}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.25,
            }}
          />
        ))}
      </svg>

      {/* Classification tag */}
      <motion.div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div
          className="px-3 py-1 rounded border text-[10px] font-mono tracking-wider"
          style={{
            borderColor: `${character.color}50`,
            backgroundColor: `${character.color}10`,
            color: character.color,
            boxShadow: `0 0 20px ${character.color}30`,
          }}
        >
          {character.codename}
        </div>
      </motion.div>

      {/* Action text */}
      {action && (
        <motion.div
          className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: [0.7, 1, 0.7], y: 0 }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span
            className="text-[10px] font-mono tracking-wider"
            style={{ color: character.color }}
          >
            {action}
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}

// ============================================
// CHARACTER CARD - Detailed info panel
// ============================================
export function CharacterCard({
  character,
  expanded = false
}: {
  character: CharacterData
  expanded?: boolean
}) {
  return (
    <motion.div
      className="relative p-4 rounded-lg border backdrop-blur-xl"
      style={{
        borderColor: `${character.color}30`,
        backgroundColor: 'rgba(0,0,0,0.8)',
        boxShadow: `0 0 30px ${character.color}20, inset 0 1px 0 ${character.color}10`,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {/* Header line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${character.color}, transparent)` }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="flex items-start gap-4">
        <HolographicSilhouette character={character} size="small" variant="scan" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-mono text-sm font-bold tracking-wider"
              style={{ color: character.color }}
            >
              {character.codename}
            </span>
            <motion.span
              className="px-1.5 py-0.5 rounded text-[8px] font-mono"
              style={{
                backgroundColor: `${character.color}20`,
                color: character.color,
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ACTIVE
            </motion.span>
          </div>

          <p className="text-[10px] text-neutral-500 font-mono mb-2">
            {character.name}
          </p>

          <div className="space-y-1 text-[10px] font-mono">
            <p className="text-neutral-400">
              <span style={{ color: character.color }}>CLASS:</span> {character.classification}
            </p>
            <p className="text-neutral-400">
              <span style={{ color: character.color }}>ROLE:</span> {character.role}
            </p>
            <p style={{ color: character.color }}>
              » {character.signature}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom scan line */}
      <motion.div
        className="absolute bottom-0 h-[1px]"
        style={{ background: character.color }}
        initial={{ left: 0, right: '100%' }}
        animate={{ left: ['0%', '100%'], right: ['100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  )
}

// ============================================
// CHARACTER REVEAL SEQUENCE
// ============================================
export function CharacterRevealSequence({
  characters = CHARACTERS,
  onComplete,
  interval = 2500
}: {
  characters?: CharacterData[]
  onComplete?: () => void
  interval?: number
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<'entering' | 'showing' | 'exiting'>('entering')

  useEffect(() => {
    const timer = setInterval(() => {
      if (phase === 'entering') {
        setPhase('showing')
      } else if (phase === 'showing') {
        setPhase('exiting')
      } else {
        if (currentIndex < characters.length - 1) {
          setCurrentIndex(i => i + 1)
          setPhase('entering')
        } else {
          onComplete?.()
        }
      }
    }, interval / 3)

    return () => clearInterval(timer)
  }, [currentIndex, phase, characters.length, interval, onComplete])

  const character = characters[currentIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background pulse */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${character.color}10 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="relative flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{
            opacity: phase === 'exiting' ? 0 : 1,
            scale: phase === 'exiting' ? 0.9 : 1,
            y: phase === 'exiting' ? -30 : 0,
          }}
          transition={{ duration: 0.5 }}
        >
          <HolographicSilhouette
            character={character}
            size="large"
            variant="materialize"
          />

          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.h2
              className="text-3xl font-bold font-mono tracking-wider mb-2"
              style={{
                color: character.color,
                textShadow: `0 0 30px ${character.color}`,
              }}
              animate={{
                textShadow: [
                  `0 0 30px ${character.color}`,
                  `0 0 60px ${character.color}`,
                  `0 0 30px ${character.color}`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {character.codename}
            </motion.h2>

            <p className="text-neutral-400 font-mono text-sm mb-1">
              {character.classification}
            </p>

            <motion.p
              className="text-lg font-mono"
              style={{ color: character.color }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              "{character.signature}"
            </motion.p>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Progress indicators */}
      <div className="absolute bottom-20 flex gap-3">
        {characters.map((char, i) => (
          <motion.div
            key={char.id}
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: i === currentIndex ? char.color : 'transparent',
              border: `2px solid ${i <= currentIndex ? char.color : 'rgba(255,255,255,0.2)'}`,
              boxShadow: i === currentIndex ? `0 0 15px ${char.color}` : 'none',
            }}
            animate={i === currentIndex ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// MINI CHARACTER INDICATOR - For HUD displays
// ============================================
export function CharacterIndicator({
  character,
  status = 'active'
}: {
  character: CharacterData
  status?: 'active' | 'standby' | 'complete'
}) {
  return (
    <motion.div
      className="flex items-center gap-2 px-2 py-1 rounded border"
      style={{
        borderColor: `${character.color}30`,
        backgroundColor: `${character.color}10`,
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: character.color }}
        animate={status === 'active' ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <span
        className="text-[10px] font-mono"
        style={{ color: character.color }}
      >
        {character.codename}
      </span>
      <span className="text-[8px] text-neutral-500 font-mono uppercase">
        {status}
      </span>
    </motion.div>
  )
}

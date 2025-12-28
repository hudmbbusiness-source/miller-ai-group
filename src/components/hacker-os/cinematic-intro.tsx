'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Character ASCII art - pixelated silhouettes
const CHARACTERS = {
  bart: {
    name: 'BART SIMPSON',
    tagline: 'EAT MY SHORTS',
    color: '#ffd700',
    ascii: `
    ▄▄▄▄▄▄▄▄▄
   ██░░░░░░░██
  ██░▄▄░░▄▄░░██
  ██░██░░██░░██
  ██░░░░░░░░░██
   ██░▀▀▀▀░██
    ██░░░░██
     ██████
    ██░░░░██
   ██░░░░░░██
  ██░░░░░░░░██
 ██░░██░░██░░██
██░░░░░░░░░░░░██
 ████░░░░░░████
    ██░░░░██
    ██░░░░██
   ████  ████
    `,
  },
  wick: {
    name: 'JOHN WICK',
    tagline: 'YEAH, I\'M THINKING I\'M BACK',
    color: '#ff0040',
    ascii: `
      ▄▄████▄▄
    ▄██▀░░░░▀██▄
   ██░░░░░░░░░░██
  ██░░▄▄░░▄▄░░░██
  ██░░██░░██░░░██
  ██░░░░░░░░░░░██
   ██░░▀▀▀▀░░██
    ██░░░░░░██
   ████████████
  ██░░░░██░░░░██
  ██░░░░██░░░░██
  ██░░░░██░░░░██
  ██░░░████░░░██
  ██░░░░░░░░░░██
   ██░░░░░░░░██
   ██░░░░░░░░██
    ██░░░░░░██
    ██░░  ░░██
    `,
  },
  joker: {
    name: 'THE JOKER',
    tagline: 'WHY SO SERIOUS?',
    color: '#9d00ff',
    ascii: `
     ▄▄▄████▄▄▄
   ▄██▀▀░░░░▀▀██▄
  ██░░▄▄▄▄▄▄▄░░██
 ██░▄█▀░░░░░▀█▄░██
 ██░█░▄▀░░▀▄░█░██
 ██░█░░░░░░░░█░██
 ██░░█▄░░░░▄█░░██
 ██░░░▀████▀░░░██
  ██░▄▀▀▀▀▀▀▄░██
   ██░▀▄▄▄▄▀░██
    ██░░░░░░██
   ████████████
  ██░░░░░░░░░░██
  ██░░░░░░░░░░██
   ██░░░░░░░░██
    ██░░░░░░██
     ████████
    `,
  },
  leo: {
    name: 'JORDAN BELFORT',
    tagline: 'I\'M NOT F***ING LEAVING',
    color: '#00ff41',
    ascii: `
      ▄▄████▄▄
    ▄██░░░░░░██▄
   ██░░▄▄▄▄▄░░██
  ██░░█░░░░█░░░██
  ██░░█░▀░░█░░░██
  ██░░░░░░░░░░░██
   ██░░▀▀▀▀░░██
    ██░░░░░░██
   ████████████
  ██▀▀██████▀▀██
  ██░░░░██░░░░██
  ██░░░░██░░░░██
  ██░░░░██░░░░██
  ██░░░░██░░░░██
   ██░░░░░░░░██
    ██░░░░░░██
     ████████
    `,
  },
  margot: {
    name: 'MONEY QUEEN',
    tagline: 'LET ME EXPLAIN',
    color: '#ff1493',
    ascii: `
     ▄▄▄▄▄▄▄▄▄
   ▄█▀▀░░░░░▀▀█▄
  ██░▄▄▄▄▄▄▄▄░██
 ██░██░░░░░░██░██
 ██░░░▄▄░▄▄░░░░██
 ██░░░██░██░░░░██
 ██░░░░░░░░░░░░██
  ██░░░▀▀▀░░░██
   ██░░░░░░░██
    ██░░░░░██
   ██░░░░░░░██
  ██░░░████░░░██
  ██░░░░░░░░░░██
   ██░░░░░░░░██
    ██░░░░░░██
    ██░░░░░░██
     ████████
    `,
  },
}

// Money symbols that float
const MONEY_SYMBOLS = ['$', '€', '£', '¥', '₿', '💰', '💵', '💎']

interface CinematicIntroProps {
  onComplete: () => void
  autoPlay?: boolean
}

export function CinematicIntro({ onComplete, autoPlay = true }: CinematicIntroProps) {
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'characters' | 'finale' | 'done'>('intro')
  const [glitchActive, setGlitchActive] = useState(false)

  const characterKeys = Object.keys(CHARACTERS) as (keyof typeof CHARACTERS)[]
  const currentChar = CHARACTERS[characterKeys[currentCharIndex]]

  // Glitch effect
  useEffect(() => {
    if (phase === 'characters') {
      const glitchInterval = setInterval(() => {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), 100)
      }, 2000)
      return () => clearInterval(glitchInterval)
    }
  }, [phase])

  // Auto-advance characters
  useEffect(() => {
    if (!autoPlay) return

    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('characters'), 2000)
      return () => clearTimeout(timer)
    }

    if (phase === 'characters') {
      const timer = setTimeout(() => {
        if (currentCharIndex < characterKeys.length - 1) {
          setCurrentCharIndex(prev => prev + 1)
        } else {
          setPhase('finale')
        }
      }, 3000)
      return () => clearTimeout(timer)
    }

    if (phase === 'finale') {
      const timer = setTimeout(() => {
        setPhase('done')
        onComplete()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [phase, currentCharIndex, autoPlay, onComplete, characterKeys.length])

  return (
    <div className="fixed inset-0 bg-black z-[1000] overflow-hidden">
      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.1) 2px, rgba(255,0,255,0.1) 4px)',
        }}
      />

      {/* Floating money background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-20"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: -50,
            }}
            animate={{
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
              rotate: [0, 360],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear',
            }}
            style={{ color: '#00ff41' }}
          >
            {MONEY_SYMBOLS[i % MONEY_SYMBOLS.length]}
          </motion.div>
        ))}
      </div>

      {/* Intro Phase */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              animate={{
                textShadow: [
                  '0 0 20px #ff00ff',
                  '0 0 40px #ff00ff, 0 0 80px #9d00ff',
                  '0 0 20px #ff00ff',
                ],
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-center"
            >
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-magenta-400 text-sm font-mono tracking-[0.5em] mb-4"
                style={{ color: '#ff00ff' }}
              >
                MILLER AI GROUP PRESENTS
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="text-6xl md:text-8xl font-bold font-mono"
                style={{
                  color: '#ff00ff',
                  textShadow: '0 0 30px rgba(255,0,255,0.8), 0 0 60px rgba(157,0,255,0.5)',
                }}
              >
                DEDSEC
              </motion.h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character Display Phase */}
      <AnimatePresence mode="wait">
        {phase === 'characters' && (
          <motion.div
            key={currentCharIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center relative">
              {/* Rotating ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div
                  className="w-[400px] h-[400px] rounded-full border-2 border-dashed opacity-30"
                  style={{ borderColor: currentChar.color }}
                />
              </motion.div>

              {/* Character ASCII */}
              <motion.pre
                className={`font-mono text-xs md:text-sm leading-none whitespace-pre ${glitchActive ? 'animate-pulse' : ''}`}
                style={{
                  color: currentChar.color,
                  textShadow: `0 0 20px ${currentChar.color}`,
                  filter: glitchActive ? 'hue-rotate(90deg)' : 'none',
                }}
                animate={glitchActive ? { x: [-2, 2, -2, 0] } : {}}
                transition={{ duration: 0.1 }}
              >
                {currentChar.ascii}
              </motion.pre>

              {/* Character name */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-6xl font-bold font-mono mt-8"
                style={{
                  color: currentChar.color,
                  textShadow: `0 0 30px ${currentChar.color}`,
                }}
              >
                {currentChar.name}
              </motion.h2>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xl md:text-2xl font-mono mt-4 tracking-wider"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                "{currentChar.tagline}"
              </motion.p>

              {/* Progress dots */}
              <div className="flex justify-center gap-3 mt-8">
                {characterKeys.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i === currentCharIndex ? 'scale-125' : 'opacity-30'}`}
                    style={{
                      backgroundColor: i === currentCharIndex ? currentChar.color : '#fff',
                      boxShadow: i === currentCharIndex ? `0 0 10px ${currentChar.color}` : 'none',
                    }}
                    animate={i === currentCharIndex ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finale Phase */}
      <AnimatePresence>
        {phase === 'finale' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              {/* Spinning money */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-8xl mb-8"
              >
                💰
              </motion.div>

              <motion.h1
                animate={{
                  textShadow: [
                    '0 0 20px #00ff41, 0 0 40px #00ff41',
                    '0 0 40px #ffd700, 0 0 80px #ffd700',
                    '0 0 20px #00ff41, 0 0 40px #00ff41',
                  ],
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-5xl md:text-7xl font-bold font-mono"
                style={{ color: '#00ff41' }}
              >
                GET MONEY
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-mono mt-4"
                style={{ color: '#ffd700' }}
              >
                STACK PAPER. BUILD EMPIRE.
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      {phase !== 'done' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={() => {
            setPhase('done')
            onComplete()
          }}
          className="absolute bottom-8 right-8 px-6 py-3 font-mono text-sm border rounded-lg transition-all hover:scale-105"
          style={{
            borderColor: 'rgba(255,0,255,0.5)',
            color: '#ff00ff',
          }}
        >
          SKIP →
        </motion.button>
      )}

      {/* Glitch overlay */}
      {glitchActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.03) 2px, rgba(255,0,255,0.03) 4px)',
            mixBlendMode: 'screen',
          }}
        />
      )}
    </div>
  )
}

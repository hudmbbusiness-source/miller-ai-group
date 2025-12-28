'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  NeonDataStreams,
  HolographicGrid,
  GlitchOverlay,
  EncryptedGlyphs,
  SystemLogTerminal,
  WireframeLogo,
  BreachTunnel,
  NeonVortex,
} from './effects'
import {
  CHARACTERS,
  HolographicSilhouette,
  CharacterCard,
  CharacterIndicator,
} from './character-silhouettes'

// ============================================
// STAGE TYPES
// ============================================
type Stage = 'enter-system' | 'github-auth' | 'password-entry' | 'transition' | 'complete'

interface CinematicTakeoverProps {
  initialStage?: Stage
  onComplete: () => void
  userName?: string
}

// ============================================
// LOG GENERATION
// ============================================
const generateLogs = (stage: Stage, progress: number) => {
  const logs: Array<{ text: string; type: 'info' | 'success' | 'warning' | 'error' | 'system' }> = []

  if (stage === 'enter-system') {
    if (progress > 0) logs.push({ text: 'Initializing Miller AI Group Protocol...', type: 'system' })
    if (progress > 10) logs.push({ text: 'Scanning network vulnerabilities...', type: 'info' })
    if (progress > 20) logs.push({ text: 'Firewall breach detected at port 443', type: 'warning' })
    if (progress > 30) logs.push({ text: 'Deploying encrypted operatives...', type: 'system' })
    if (progress > 40) logs.push({ text: 'OPERATIVE W.I.C.K online', type: 'success' })
    if (progress > 50) logs.push({ text: 'OPERATIVE B.A.R.T online', type: 'success' })
    if (progress > 60) logs.push({ text: 'OPERATIVE J.O.K.E.R online', type: 'success' })
    if (progress > 70) logs.push({ text: 'OPERATIVE W.O.L.F online', type: 'success' })
    if (progress > 80) logs.push({ text: 'OPERATIVE M.R.O.B online', type: 'success' })
    if (progress > 90) logs.push({ text: 'All operatives deployed. Awaiting authentication...', type: 'system' })
  }

  if (stage === 'github-auth') {
    if (progress > 0) logs.push({ text: 'Intercepting OAuth handshake...', type: 'system' })
    if (progress > 15) logs.push({ text: 'Token exchange protocol initiated', type: 'info' })
    if (progress > 30) logs.push({ text: 'Bypassing GitHub security layer...', type: 'warning' })
    if (progress > 45) logs.push({ text: 'Credentials captured', type: 'success' })
    if (progress > 60) logs.push({ text: 'Session token validated', type: 'success' })
    if (progress > 75) logs.push({ text: 'Authentication pipeline secured', type: 'info' })
    if (progress > 90) logs.push({ text: 'ACCESS GRANTED - Proceeding to system entry...', type: 'system' })
  }

  if (stage === 'password-entry') {
    if (progress > 0) logs.push({ text: 'Decrypting access codes...', type: 'system' })
    if (progress > 20) logs.push({ text: 'Security matrix analysis complete', type: 'info' })
    if (progress > 40) logs.push({ text: 'Breach tunnel established', type: 'success' })
    if (progress > 60) logs.push({ text: 'Final encryption layer detected', type: 'warning' })
    if (progress > 80) logs.push({ text: 'OVERRIDE COMPLETE', type: 'success' })
    if (progress > 95) logs.push({ text: 'Welcome to Miller AI Group OS', type: 'system' })
  }

  return logs
}

// ============================================
// STAGE 1: ENTER SYSTEM
// ============================================
function StageEnterSystem({
  onComplete,
  progress
}: {
  onComplete: () => void
  progress: number
}) {
  const [currentCharacter, setCurrentCharacter] = useState(0)
  const [showCharacters, setShowCharacters] = useState(false)

  useEffect(() => {
    if (progress > 30 && !showCharacters) {
      setShowCharacters(true)
    }
  }, [progress, showCharacters])

  useEffect(() => {
    if (showCharacters && progress < 100) {
      const interval = setInterval(() => {
        setCurrentCharacter(c => (c + 1) % CHARACTERS.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [showCharacters, progress])

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <NeonDataStreams intensity={1.5} speed={1.2} />
      <HolographicGrid color="#ff00ff" perspective animated />
      <GlitchOverlay active={progress > 50} intensity="medium" />

      {/* Central display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="text-center z-20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Miller AI Logo */}
          <motion.div
            className="relative mx-auto mb-8"
            animate={{
              boxShadow: [
                '0 0 40px rgba(255,0,255,0.3)',
                '0 0 80px rgba(255,0,255,0.6)',
                '0 0 40px rgba(255,0,255,0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <WireframeLogo size={150} color="#ff00ff" rotationSpeed={8} />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Image
                src="/logos/miller-ai-group.png"
                alt="Miller AI Group"
                width={60}
                height={60}
                className="rounded-lg"
              />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-4xl md:text-6xl font-bold font-mono mb-4"
            style={{
              color: '#ff00ff',
              textShadow: '0 0 30px rgba(255,0,255,0.8), 0 0 60px rgba(157,0,255,0.5)',
            }}
            animate={{
              textShadow: [
                '0 0 30px rgba(255,0,255,0.8), 0 0 60px rgba(157,0,255,0.5)',
                '0 0 50px rgba(255,0,255,1), 0 0 100px rgba(157,0,255,0.8)',
                '0 0 30px rgba(255,0,255,0.8), 0 0 60px rgba(157,0,255,0.5)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <EncryptedGlyphs text="MILLER AI GROUP" decrypted={progress > 20} />
          </motion.h1>

          <motion.p
            className="text-neutral-400 font-mono text-lg mb-8 tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            SYSTEM TAKEOVER IN PROGRESS
          </motion.p>

          {/* Progress bar */}
          <div className="w-80 mx-auto">
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #ff00ff, #9d00ff, #ff00ff)',
                  backgroundSize: '200% 100%',
                }}
                animate={{
                  width: `${progress}%`,
                  backgroundPosition: ['0% 0%', '200% 0%'],
                }}
                transition={{
                  width: { duration: 0.3 },
                  backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
                }}
              />
            </div>
            <p className="text-xs font-mono text-fuchsia-400">
              BREACH PROGRESS: {Math.floor(progress)}%
            </p>
          </div>
        </motion.div>

        {/* Character displays */}
        <AnimatePresence>
          {showCharacters && progress < 100 && (
            <>
              {/* Left character */}
              <motion.div
                className="absolute left-10 top-1/2 -translate-y-1/2"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <HolographicSilhouette
                  character={CHARACTERS[currentCharacter]}
                  size="medium"
                  variant="scan"
                  action="INFILTRATING..."
                />
              </motion.div>

              {/* Right character */}
              <motion.div
                className="absolute right-10 top-1/2 -translate-y-1/2"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
              >
                <HolographicSilhouette
                  character={CHARACTERS[(currentCharacter + 2) % CHARACTERS.length]}
                  size="medium"
                  variant="glitch"
                  action="BYPASSING..."
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* System logs */}
      <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-30">
        <SystemLogTerminal logs={generateLogs('enter-system', progress)} speed={80} />
      </div>

      {/* Character status bar */}
      <div className="absolute top-4 right-4 space-y-2 z-30">
        {CHARACTERS.map((char, i) => (
          <motion.div
            key={char.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.2 }}
          >
            <CharacterIndicator
              character={char}
              status={progress > 40 + i * 10 ? 'active' : 'standby'}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// STAGE 2: GITHUB AUTH
// ============================================
function StageGitHubAuth({
  progress
}: {
  progress: number
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <NeonDataStreams intensity={2} speed={1.5} colors={['#ff00ff', '#9d00ff', '#00ff41']} />
      <HolographicGrid color="#00ff41" perspective animated />
      <GlitchOverlay active={progress > 30} intensity="high" />

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div className="text-center z-20">
          {/* GitHub takeover visualization */}
          <motion.div
            className="relative w-40 h-40 mx-auto mb-8"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 border-2 border-dashed rounded-full"
              style={{ borderColor: '#00ff41' }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Inner hexagon */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <motion.polygon
                points="50,10 90,30 90,70 50,90 10,70 10,30"
                fill="none"
                stroke="#ff00ff"
                strokeWidth="1"
                style={{ filter: 'drop-shadow(0 0 10px #ff00ff)' }}
                animate={{ strokeDashoffset: [0, 100] }}
                transition={{ duration: 3, repeat: Infinity }}
                strokeDasharray="5 3"
              />
            </svg>
            {/* Center GitHub icon being consumed */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-4xl"
              animate={{
                opacity: [1, 0.3, 1],
                scale: [1, 0.8, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor" style={{ color: '#00ff41' }}>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </motion.div>
          </motion.div>

          <motion.h2
            className="text-3xl font-bold font-mono mb-4"
            style={{ color: '#00ff41', textShadow: '0 0 20px rgba(0,255,65,0.8)' }}
          >
            INTERCEPTING OAUTH
          </motion.h2>

          <motion.div
            className="text-sm font-mono text-neutral-400 mb-6"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {progress < 30 && 'Capturing authentication tokens...'}
            {progress >= 30 && progress < 60 && 'Bypassing security protocols...'}
            {progress >= 60 && progress < 90 && 'Validating credentials...'}
            {progress >= 90 && 'ACCESS GRANTED'}
          </motion.div>

          {/* Progress */}
          <div className="w-64 mx-auto">
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-fuchsia-500 via-green-400 to-fuchsia-500"
                style={{ backgroundSize: '200% 100%' }}
                animate={{
                  width: `${progress}%`,
                  backgroundPosition: ['0% 0%', '200% 0%'],
                }}
                transition={{
                  width: { duration: 0.3 },
                  backgroundPosition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Character actions */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-8 z-30">
        {CHARACTERS.slice(0, 3).map((char, i) => (
          <motion.div
            key={char.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.3 }}
          >
            <CharacterCard character={char} />
          </motion.div>
        ))}
      </div>

      {/* Logs */}
      <div className="absolute bottom-4 left-4 w-80 z-30">
        <SystemLogTerminal logs={generateLogs('github-auth', progress)} speed={60} />
      </div>
    </div>
  )
}

// ============================================
// STAGE 3: PASSWORD ENTRY / FINAL BREACH
// ============================================
function StagePasswordEntry({
  progress,
  userName
}: {
  progress: number
  userName: string
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <NeonDataStreams intensity={2.5} speed={2} colors={['#ff00ff', '#9d00ff', '#ffd700', '#00ff41']} />
      <BreachTunnel active={progress > 40} color="#ff00ff" />
      <GlitchOverlay active={progress > 60} intensity="high" />

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div className="text-center z-20">
          {/* Final breach visualization */}
          <motion.div
            className="relative w-60 h-60 mx-auto mb-8"
            animate={{
              boxShadow: [
                '0 0 50px rgba(255,0,255,0.4)',
                '0 0 100px rgba(255,0,255,0.8)',
                '0 0 50px rgba(255,0,255,0.4)',
              ],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {/* Animated rings */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute border rounded-full"
                style={{
                  inset: `${i * 12}%`,
                  borderColor: i % 2 === 0 ? '#ff00ff' : '#9d00ff',
                }}
                animate={{
                  rotate: i % 2 === 0 ? 360 : -360,
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  rotate: { duration: 10 - i * 1.5, repeat: Infinity, ease: 'linear' },
                  opacity: { duration: 2, repeat: Infinity },
                }}
              />
            ))}

            {/* Center logo */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Image
                src="/logos/miller-ai-group.png"
                alt="Miller AI Group"
                width={80}
                height={80}
                className="rounded-xl"
                style={{ filter: 'drop-shadow(0 0 20px rgba(255,0,255,0.8))' }}
              />
            </motion.div>
          </motion.div>

          <motion.h2
            className="text-4xl font-bold font-mono mb-4"
            style={{
              color: '#ff00ff',
              textShadow: '0 0 30px rgba(255,0,255,0.8)',
            }}
          >
            {progress < 80 ? 'FINAL BREACH' : 'SYSTEM ACCESSED'}
          </motion.h2>

          <motion.p
            className="text-xl font-mono mb-4"
            style={{ color: '#ffd700' }}
          >
            Welcome, {userName}
          </motion.p>

          <motion.p
            className="text-sm font-mono text-neutral-400"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {progress < 50 && 'Decrypting access matrix...'}
            {progress >= 50 && progress < 80 && 'Security override in progress...'}
            {progress >= 80 && 'WELCOME TO MILLER AI GROUP OS'}
          </motion.p>

          {/* Final progress bar */}
          <motion.div
            className="w-80 mx-auto mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="h-3 bg-neutral-800 rounded-full overflow-hidden border border-fuchsia-500/30">
              <motion.div
                className="h-full"
                style={{
                  background: 'linear-gradient(90deg, #ff00ff, #ffd700, #00ff41, #ff00ff)',
                  backgroundSize: '300% 100%',
                }}
                animate={{
                  width: `${progress}%`,
                  backgroundPosition: ['0% 0%', '300% 0%'],
                }}
                transition={{
                  width: { duration: 0.3 },
                  backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* All operatives confirmation */}
      <div className="absolute bottom-4 left-4 right-4 z-30">
        <div className="flex justify-center gap-4 mb-4">
          {CHARACTERS.map((char, i) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: progress > 60 + i * 5 ? 1 : 0,
                scale: progress > 60 + i * 5 ? 1 : 0,
              }}
              className="text-center"
            >
              <motion.div
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-mono mb-1"
                style={{
                  borderColor: char.color,
                  color: char.color,
                  boxShadow: `0 0 15px ${char.color}50`,
                }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              >
                ✓
              </motion.div>
              <p className="text-[8px] font-mono" style={{ color: char.color }}>
                {char.codename.split('.')[0]}
              </p>
            </motion.div>
          ))}
        </div>
        <SystemLogTerminal logs={generateLogs('password-entry', progress)} speed={40} />
      </div>
    </div>
  )
}

// ============================================
// STAGE 4: TRANSITION TO DASHBOARD
// ============================================
function StageTransition({
  onComplete
}: {
  onComplete: () => void
}) {
  return (
    <NeonVortex active onComplete={onComplete} color="#ff00ff" />
  )
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================
export function CinematicTakeover({
  initialStage = 'enter-system',
  onComplete,
  userName = 'Operator'
}: CinematicTakeoverProps) {
  const [stage, setStage] = useState<Stage>(initialStage)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)

  // Progress simulation
  useEffect(() => {
    if (stage === 'complete') return

    const interval = setInterval(() => {
      progressRef.current += Math.random() * 3 + 1

      if (progressRef.current >= 100) {
        progressRef.current = 100
        setProgress(100)

        // Advance to next stage
        setTimeout(() => {
          if (stage === 'enter-system') {
            setStage('github-auth')
            progressRef.current = 0
            setProgress(0)
          } else if (stage === 'github-auth') {
            setStage('password-entry')
            progressRef.current = 0
            setProgress(0)
          } else if (stage === 'password-entry') {
            setStage('transition')
          }
        }, 500)
      } else {
        setProgress(progressRef.current)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [stage])

  const handleTransitionComplete = useCallback(() => {
    setStage('complete')
    onComplete()
  }, [onComplete])

  return (
    <AnimatePresence mode="wait">
      {stage === 'enter-system' && (
        <motion.div
          key="enter-system"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <StageEnterSystem
            progress={progress}
            onComplete={() => setStage('github-auth')}
          />
        </motion.div>
      )}

      {stage === 'github-auth' && (
        <motion.div
          key="github-auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <StageGitHubAuth progress={progress} />
        </motion.div>
      )}

      {stage === 'password-entry' && (
        <motion.div
          key="password-entry"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <StagePasswordEntry progress={progress} userName={userName} />
        </motion.div>
      )}

      {stage === 'transition' && (
        <motion.div
          key="transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <StageTransition onComplete={handleTransitionComplete} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Export components for external use
export { CHARACTERS } from './character-silhouettes'
export type { Stage as CinematicStage }

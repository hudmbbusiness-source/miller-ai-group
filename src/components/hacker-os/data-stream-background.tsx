'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { motion } from 'framer-motion'

interface DataStreamBackgroundProps {
  particleCount?: number
  showGrid?: boolean
  showPolygons?: boolean
  intensity?: 'low' | 'medium' | 'high'
  color?: 'cyan' | 'green' | 'purple' | 'mixed'
  className?: string
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  color: string
}

const colorMap = {
  cyan: ['#00ffff', '#00cccc', '#0099cc'],
  green: ['#00ff41', '#00cc33', '#00aa22'],
  purple: ['#ff00ff', '#9d00ff', '#ff1493', '#cc00cc'],  // DedSec magenta/purple
  mixed: ['#ff00ff', '#9d00ff', '#00ff41', '#ffd700'],   // DedSec + money colors
}

const intensitySettings = {
  low: { particles: 20, speed: 0.3 },
  medium: { particles: 40, speed: 0.5 },
  high: { particles: 60, speed: 0.8 },
}

export function DataStreamBackground({
  particleCount,
  showGrid = true,
  showPolygons = true,
  intensity = 'medium',
  color = 'cyan',
  className,
}: DataStreamBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const settings = intensitySettings[intensity]
  const actualParticleCount = particleCount ?? settings.particles
  const colors = colorMap[color]

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Initialize particles
  const particles = useMemo(() => {
    const result: Particle[] = []
    for (let i = 0; i < actualParticleCount; i++) {
      result.push({
        id: i,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        size: Math.random() * 2 + 1,
        speed: (Math.random() * 0.5 + 0.5) * settings.speed,
        opacity: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    return result
  }, [dimensions, actualParticleCount, colors, settings.speed])

  // Canvas animation
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || prefersReducedMotion) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const localParticles = [...particles]

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height)

      // Update and draw particles
      localParticles.forEach(particle => {
        // Move particle upward
        particle.y -= particle.speed
        if (particle.y < -10) {
          particle.y = dimensions.height + 10
          particle.x = Math.random() * dimensions.width
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.opacity
        ctx.fill()

        // Draw trailing line
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(particle.x, particle.y + particle.speed * 20)
        ctx.strokeStyle = particle.color
        ctx.globalAlpha = particle.opacity * 0.3
        ctx.lineWidth = particle.size * 0.5
        ctx.stroke()
      })

      ctx.globalAlpha = 1
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions, particles, prefersReducedMotion])

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Grid background */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      )}

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: prefersReducedMotion ? 0.3 : 1 }}
      />

      {/* Rotating polygons */}
      {showPolygons && !prefersReducedMotion && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-5">
              <polygon
                points="50,5 95,25 95,75 50,95 5,75 5,25"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-cyan-500"
              />
            </svg>
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-5">
              <polygon
                points="50,10 90,30 90,70 50,90 10,70 10,30"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-purple-500"
              />
            </svg>
          </motion.div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/4 left-1/4 w-1/3 h-1/3"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-[0.03]">
              <polygon
                points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.3"
                className="text-green-500"
              />
            </svg>
          </motion.div>
        </>
      )}

      {/* Gradient orbs */}
      <motion.div
        animate={prefersReducedMotion ? {} : {
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 60%)',
          top: '-10%',
          left: '-10%',
          filter: 'blur(80px)',
        }}
      />

      <motion.div
        animate={prefersReducedMotion ? {} : {
          x: [0, -40, 0],
          y: [0, 30, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(191, 0, 255, 0.1) 0%, transparent 60%)',
          bottom: '-5%',
          right: '-5%',
          filter: 'blur(80px)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  )
}

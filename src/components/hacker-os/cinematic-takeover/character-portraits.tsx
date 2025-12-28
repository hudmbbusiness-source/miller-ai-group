'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================
// CHARACTER DEFINITIONS
// ============================================

export interface Character {
  id: string
  name: string
  codename: string
  alias: string
  quote: string
  specialty: string
  threatLevel: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
}

export const OPERATIVES: Character[] = [
  {
    id: 'wick',
    name: 'JOHN WICK',
    codename: 'BABA YAGA',
    alias: 'The Boogeyman',
    quote: "People keep asking if I'm back. Yeah, I'm thinking I'm back.",
    specialty: 'TACTICAL ELIMINATION',
    threatLevel: 'EXTREME',
    primaryColor: '#ff0040',
    secondaryColor: '#8b0000',
    backgroundColor: '#1a0a0a'
  },
  {
    id: 'bart',
    name: 'BART SIMPSON',
    codename: 'EL BARTO',
    alias: 'The Underachiever',
    quote: "Eat my shorts, firewall. Ay caramba!",
    specialty: 'CHAOS ENGINEERING',
    threatLevel: 'UNPREDICTABLE',
    primaryColor: '#ffd700',
    secondaryColor: '#ff8c00',
    backgroundColor: '#1a1a0a'
  },
  {
    id: 'joker',
    name: 'THE JOKER',
    codename: 'AGENT OF CHAOS',
    alias: 'Clown Prince of Crime',
    quote: "Why so serious about your security?",
    specialty: 'PSYCHOLOGICAL WARFARE',
    threatLevel: 'MAXIMUM',
    primaryColor: '#9d00ff',
    secondaryColor: '#4b0082',
    backgroundColor: '#0a0a1a'
  },
  {
    id: 'wolf',
    name: 'JORDAN BELFORT',
    codename: 'THE WOLF',
    alias: 'Wall Street Predator',
    quote: "I'm not f***ing leaving! The money is OURS!",
    specialty: 'FINANCIAL EXTRACTION',
    threatLevel: 'SEVERE',
    primaryColor: '#00ff41',
    secondaryColor: '#006400',
    backgroundColor: '#0a1a0a'
  },
  {
    id: 'duchess',
    name: 'NAOMI LAPAGLIA',
    codename: 'THE DUCHESS',
    alias: 'The Bay Ridge Beauty',
    quote: "Let me explain this in terms you'll understand.",
    specialty: 'SOCIAL ENGINEERING',
    threatLevel: 'HIGH',
    primaryColor: '#ff1493',
    secondaryColor: '#c71585',
    backgroundColor: '#1a0a15'
  }
]

// ============================================
// DITHER PATTERN GENERATOR
// ============================================

function createDitherPattern(ctx: CanvasRenderingContext2D, color: string, size: number = 2): CanvasPattern | null {
  const patternCanvas = document.createElement('canvas')
  patternCanvas.width = size * 2
  patternCanvas.height = size * 2
  const patternCtx = patternCanvas.getContext('2d')
  if (!patternCtx) return null

  patternCtx.fillStyle = color
  patternCtx.fillRect(0, 0, size, size)
  patternCtx.fillRect(size, size, size, size)

  return ctx.createPattern(patternCanvas, 'repeat')
}

// ============================================
// DETAILED CHARACTER PORTRAIT RENDERER
// ============================================

export function CharacterPortraitCanvas({
  character,
  size = 400,
  showGlitch = true,
  showScanlines = true,
  animate = true
}: {
  character: Character
  size?: number
  showGlitch?: boolean
  showScanlines?: boolean
  animate?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2

    // Color parsing
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 0, b: 255 }
    }

    const primaryRgb = hexToRgb(character.primaryColor)

    // ============================================
    // JOHN WICK - Detailed Portrait
    // ============================================
    const drawJohnWick = (time: number) => {
      const breathe = Math.sin(time * 1.5) * 2
      const blink = Math.sin(time * 0.3) > 0.95 ? 0.3 : 1

      // Hair - long, dark, slightly wavy
      ctx.fillStyle = '#0a0a0a'
      ctx.beginPath()
      // Main hair mass
      ctx.ellipse(centerX, centerY - 35 + breathe, 75, 95, 0, 0, Math.PI * 2)
      ctx.fill()

      // Hair strands falling down sides
      ctx.beginPath()
      ctx.moveTo(centerX - 60, centerY - 80 + breathe)
      ctx.quadraticCurveTo(centerX - 75, centerY, centerX - 65, centerY + 60 + breathe)
      ctx.lineTo(centerX - 55, centerY + 60 + breathe)
      ctx.quadraticCurveTo(centerX - 60, centerY - 20, centerX - 50, centerY - 75 + breathe)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(centerX + 60, centerY - 80 + breathe)
      ctx.quadraticCurveTo(centerX + 75, centerY, centerX + 65, centerY + 60 + breathe)
      ctx.lineTo(centerX + 55, centerY + 60 + breathe)
      ctx.quadraticCurveTo(centerX + 60, centerY - 20, centerX + 50, centerY - 75 + breathe)
      ctx.fill()

      // Face
      ctx.fillStyle = '#c9a67a'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 40 + breathe, 52, 65, 0, 0, Math.PI * 2)
      ctx.fill()

      // Facial shadows for definition
      const faceGradient = ctx.createRadialGradient(
        centerX - 20, centerY - 60 + breathe, 0,
        centerX, centerY - 40 + breathe, 70
      )
      faceGradient.addColorStop(0, 'rgba(0,0,0,0)')
      faceGradient.addColorStop(1, 'rgba(0,0,0,0.3)')
      ctx.fillStyle = faceGradient
      ctx.fill()

      // Heavy stubble/beard shadow
      ctx.fillStyle = 'rgba(30,30,30,0.6)'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 10 + breathe, 45, 40, 0, 0.2, Math.PI - 0.2)
      ctx.fill()

      // Stubble texture
      ctx.fillStyle = 'rgba(20,20,20,0.4)'
      for (let i = 0; i < 200; i++) {
        const sx = centerX + (Math.random() - 0.5) * 80
        const sy = centerY - 30 + Math.random() * 60 + breathe
        if (sy > centerY - 35 + breathe) {
          ctx.fillRect(sx, sy, 1, 1)
        }
      }

      // Eyes - intense, focused
      // Eye whites
      ctx.fillStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.ellipse(centerX - 20, centerY - 55 + breathe, 12, 7 * blink, 0, 0, Math.PI * 2)
      ctx.ellipse(centerX + 20, centerY - 55 + breathe, 12, 7 * blink, 0, 0, Math.PI * 2)
      ctx.fill()

      // Iris
      ctx.fillStyle = '#3d2314'
      ctx.beginPath()
      ctx.arc(centerX - 20, centerY - 55 + breathe, 5 * blink, 0, Math.PI * 2)
      ctx.arc(centerX + 20, centerY - 55 + breathe, 5 * blink, 0, Math.PI * 2)
      ctx.fill()

      // Pupils
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX - 20, centerY - 55 + breathe, 2.5 * blink, 0, Math.PI * 2)
      ctx.arc(centerX + 20, centerY - 55 + breathe, 2.5 * blink, 0, Math.PI * 2)
      ctx.fill()

      // Eyebrows - furrowed, intense
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(centerX - 35, centerY - 68 + breathe)
      ctx.quadraticCurveTo(centerX - 20, centerY - 73 + breathe, centerX - 8, centerY - 68 + breathe)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerX + 35, centerY - 68 + breathe)
      ctx.quadraticCurveTo(centerX + 20, centerY - 73 + breathe, centerX + 8, centerY - 68 + breathe)
      ctx.stroke()

      // Nose
      ctx.strokeStyle = 'rgba(100,70,50,0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - 50 + breathe)
      ctx.lineTo(centerX - 3, centerY - 30 + breathe)
      ctx.stroke()

      // Mouth - thin, determined line
      ctx.strokeStyle = '#8b6b5a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(centerX - 15, centerY - 15 + breathe)
      ctx.lineTo(centerX + 15, centerY - 15 + breathe)
      ctx.stroke()

      // Suit - black tactical
      ctx.fillStyle = '#0a0a0a'
      ctx.beginPath()
      ctx.moveTo(centerX - 85, centerY + 70 + breathe)
      ctx.lineTo(centerX - 45, centerY + 25 + breathe)
      ctx.lineTo(centerX, centerY + 45 + breathe)
      ctx.lineTo(centerX + 45, centerY + 25 + breathe)
      ctx.lineTo(centerX + 85, centerY + 70 + breathe)
      ctx.lineTo(centerX + 100, size)
      ctx.lineTo(centerX - 100, size)
      ctx.closePath()
      ctx.fill()

      // Suit lapels
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(centerX - 40, centerY + 30 + breathe)
      ctx.lineTo(centerX - 15, centerY + 80 + breathe)
      ctx.moveTo(centerX + 40, centerY + 30 + breathe)
      ctx.lineTo(centerX + 15, centerY + 80 + breathe)
      ctx.stroke()

      // White shirt collar
      ctx.fillStyle = '#f5f5f5'
      ctx.beginPath()
      ctx.moveTo(centerX - 25, centerY + 30 + breathe)
      ctx.lineTo(centerX, centerY + 55 + breathe)
      ctx.lineTo(centerX + 25, centerY + 30 + breathe)
      ctx.lineTo(centerX + 15, centerY + 25 + breathe)
      ctx.lineTo(centerX, centerY + 40 + breathe)
      ctx.lineTo(centerX - 15, centerY + 25 + breathe)
      ctx.closePath()
      ctx.fill()

      // Black tie
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.moveTo(centerX - 8, centerY + 40 + breathe)
      ctx.lineTo(centerX, centerY + 100 + breathe)
      ctx.lineTo(centerX + 8, centerY + 40 + breathe)
      ctx.closePath()
      ctx.fill()
    }

    // ============================================
    // BART SIMPSON - Detailed Portrait
    // ============================================
    const drawBartSimpson = (time: number) => {
      const bounce = Math.sin(time * 3) * 4
      const eyeMove = Math.sin(time * 2) * 2

      // Yellow head
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 30 + bounce, 60, 70, 0, 0, Math.PI * 2)
      ctx.fill()

      // Signature spiky hair - 9 points, THE Bart look
      ctx.fillStyle = '#ffd700'
      const spikes = 9
      for (let i = 0; i < spikes; i++) {
        const angle = ((i - (spikes - 1) / 2) / spikes) * Math.PI * 0.8 - Math.PI / 2
        const baseRadius = 55
        const spikeHeight = i % 2 === 0 ? 45 : 35

        const baseX1 = centerX + Math.cos(angle - 0.15) * baseRadius
        const baseY1 = centerY - 70 + Math.sin(angle - 0.15) * baseRadius + bounce
        const tipX = centerX + Math.cos(angle) * (baseRadius + spikeHeight)
        const tipY = centerY - 70 + Math.sin(angle) * (baseRadius + spikeHeight) + bounce
        const baseX2 = centerX + Math.cos(angle + 0.15) * baseRadius
        const baseY2 = centerY - 70 + Math.sin(angle + 0.15) * baseRadius + bounce

        ctx.beginPath()
        ctx.moveTo(baseX1, baseY1)
        ctx.lineTo(tipX, tipY)
        ctx.lineTo(baseX2, baseY2)
        ctx.closePath()
        ctx.fill()
      }

      // Eyes - big, round, Simpsons style (overlapping)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(centerX - 12, centerY - 45 + bounce, 25, 30, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(centerX + 18, centerY - 45 + bounce, 25, 30, 0, 0, Math.PI * 2)
      ctx.fill()

      // Eye outlines
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(centerX - 12, centerY - 45 + bounce, 25, 30, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(centerX + 18, centerY - 45 + bounce, 25, 30, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Pupils - looking to the side mischievously
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX - 5 + eyeMove, centerY - 43 + bounce, 8, 0, Math.PI * 2)
      ctx.arc(centerX + 25 + eyeMove, centerY - 43 + bounce, 8, 0, Math.PI * 2)
      ctx.fill()

      // Nose - small bump
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.ellipse(centerX + 30, centerY - 25 + bounce, 12, 10, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Mouth - mischievous smirk
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(centerX - 5, centerY - 5 + bounce)
      ctx.quadraticCurveTo(centerX + 15, centerY + 15 + bounce, centerX + 35, centerY - 5 + bounce)
      ctx.stroke()

      // Overbite tooth
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.rect(centerX + 5, centerY - 5 + bounce, 8, 8)
      ctx.fill()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.stroke()

      // Ear
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.ellipse(centerX - 55, centerY - 30 + bounce, 10, 15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#e5c100'
      ctx.lineWidth = 2
      ctx.stroke()

      // Neck
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(centerX - 20, centerY + 30 + bounce, 40, 30)

      // Red shirt
      ctx.fillStyle = '#ff4444'
      ctx.beginPath()
      ctx.moveTo(centerX - 70, centerY + 60 + bounce)
      ctx.lineTo(centerX + 70, centerY + 60 + bounce)
      ctx.lineTo(centerX + 85, size)
      ctx.lineTo(centerX - 85, size)
      ctx.closePath()
      ctx.fill()

      // Shirt collar/neckline
      ctx.beginPath()
      ctx.moveTo(centerX - 25, centerY + 55 + bounce)
      ctx.quadraticCurveTo(centerX, centerY + 75 + bounce, centerX + 25, centerY + 55 + bounce)
      ctx.stroke()

      // Orange trim
      ctx.fillStyle = '#ff8c00'
      ctx.fillRect(centerX - 70, centerY + 60 + bounce, 140, 12)

      // Blue shorts hint
      ctx.fillStyle = '#4169e1'
      ctx.fillRect(centerX - 40, size - 60, 80, 60)
    }

    // ============================================
    // THE JOKER - Detailed Portrait
    // ============================================
    const drawJoker = (time: number) => {
      const twitch = Math.random() > 0.92 ? (Math.random() - 0.5) * 15 : 0
      const breathe = Math.sin(time * 1.8) * 2
      const eyeTwitch = Math.random() > 0.95 ? 3 : 0

      // Green hair - slicked back with strands
      ctx.fillStyle = '#228b22'
      ctx.beginPath()
      ctx.ellipse(centerX + twitch, centerY - 45 + breathe, 65, 80, 0, Math.PI * 1.1, Math.PI * 1.9)
      ctx.fill()

      // Hair strands going up/back
      for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX - 45 + i * 15 + twitch, centerY - 95 + breathe)
        ctx.quadraticCurveTo(
          centerX - 35 + i * 15 + twitch + Math.sin(time + i) * 5,
          centerY - 140 + breathe,
          centerX - 25 + i * 15 + twitch,
          centerY - 120 + breathe + Math.cos(time + i) * 3
        )
        ctx.lineWidth = 10
        ctx.strokeStyle = '#228b22'
        ctx.stroke()
      }

      // White painted face
      ctx.fillStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.ellipse(centerX + twitch, centerY - 35 + breathe, 55, 68, 0, 0, Math.PI * 2)
      ctx.fill()

      // Face contour shadows
      ctx.fillStyle = 'rgba(180,180,180,0.3)'
      ctx.beginPath()
      ctx.ellipse(centerX - 25 + twitch, centerY - 20 + breathe, 20, 35, -0.3, 0, Math.PI * 2)
      ctx.ellipse(centerX + 25 + twitch, centerY - 20 + breathe, 20, 35, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Dark eye sockets - smeared makeup
      ctx.fillStyle = '#1a1a3a'
      ctx.beginPath()
      ctx.ellipse(centerX - 22 + twitch + eyeTwitch, centerY - 50 + breathe, 22, 18, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(centerX + 22 + twitch - eyeTwitch, centerY - 50 + breathe, 22, 18, 0.2, 0, Math.PI * 2)
      ctx.fill()

      // Makeup smears/drips
      ctx.fillStyle = '#1a1a3a'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(
          centerX - 30 + i * 8 + twitch,
          centerY - 30 + i * 10 + breathe,
          3, 8, 0, 0, Math.PI * 2
        )
        ctx.fill()
      }

      // Eyes - wild, manic
      ctx.fillStyle = '#ffff00'
      ctx.beginPath()
      ctx.arc(centerX - 22 + twitch + eyeTwitch, centerY - 50 + breathe, 8, 0, Math.PI * 2)
      ctx.arc(centerX + 22 + twitch - eyeTwitch, centerY - 50 + breathe, 8, 0, Math.PI * 2)
      ctx.fill()

      // Pupils - small, crazy
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX - 22 + twitch + eyeTwitch, centerY - 50 + breathe, 4, 0, Math.PI * 2)
      ctx.arc(centerX + 22 + twitch - eyeTwitch, centerY - 50 + breathe, 4, 0, Math.PI * 2)
      ctx.fill()

      // THE SMILE - Glasgow smile/scars
      // Red lipstick base
      ctx.fillStyle = '#cc0000'
      ctx.beginPath()
      ctx.moveTo(centerX - 50 + twitch, centerY - 15 + breathe)
      ctx.quadraticCurveTo(centerX + twitch, centerY + 20 + breathe, centerX + 50 + twitch, centerY - 15 + breathe)
      ctx.quadraticCurveTo(centerX + twitch, centerY + 5 + breathe, centerX - 50 + twitch, centerY - 15 + breathe)
      ctx.fill()

      // Teeth in smile
      ctx.fillStyle = '#ffffe0'
      ctx.beginPath()
      ctx.moveTo(centerX - 35 + twitch, centerY - 10 + breathe)
      ctx.lineTo(centerX + 35 + twitch, centerY - 10 + breathe)
      ctx.lineTo(centerX + 30 + twitch, centerY + 5 + breathe)
      ctx.lineTo(centerX - 30 + twitch, centerY + 5 + breathe)
      ctx.closePath()
      ctx.fill()

      // Tooth lines
      ctx.strokeStyle = '#cccccc'
      ctx.lineWidth = 1
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX + i * 10 + twitch, centerY - 10 + breathe)
        ctx.lineTo(centerX + i * 9 + twitch, centerY + 5 + breathe)
        ctx.stroke()
      }

      // Scar lines extending from mouth
      ctx.strokeStyle = '#990000'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(centerX - 50 + twitch, centerY - 15 + breathe)
      ctx.lineTo(centerX - 65 + twitch, centerY - 40 + breathe)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerX + 50 + twitch, centerY - 15 + breathe)
      ctx.lineTo(centerX + 65 + twitch, centerY - 40 + breathe)
      ctx.stroke()

      // Purple suit
      ctx.fillStyle = '#4b0082'
      ctx.beginPath()
      ctx.moveTo(centerX - 80 + twitch, centerY + 60 + breathe)
      ctx.lineTo(centerX - 35 + twitch, centerY + 25 + breathe)
      ctx.lineTo(centerX + twitch, centerY + 45 + breathe)
      ctx.lineTo(centerX + 35 + twitch, centerY + 25 + breathe)
      ctx.lineTo(centerX + 80 + twitch, centerY + 60 + breathe)
      ctx.lineTo(centerX + 95 + twitch, size)
      ctx.lineTo(centerX - 95 + twitch, size)
      ctx.closePath()
      ctx.fill()

      // Suit pinstripes
      ctx.strokeStyle = '#6a0dad'
      ctx.lineWidth = 1
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX + i * 10 + twitch, centerY + 45 + breathe)
        ctx.lineTo(centerX + i * 12 + twitch, size)
        ctx.stroke()
      }

      // Green vest
      ctx.fillStyle = '#228b22'
      ctx.beginPath()
      ctx.moveTo(centerX - 25 + twitch, centerY + 35 + breathe)
      ctx.lineTo(centerX + twitch, centerY + 70 + breathe)
      ctx.lineTo(centerX + 25 + twitch, centerY + 35 + breathe)
      ctx.closePath()
      ctx.fill()

      // Orange/yellow flower on lapel
      ctx.fillStyle = '#ffa500'
      ctx.beginPath()
      ctx.arc(centerX - 35 + twitch, centerY + 45 + breathe, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffff00'
      ctx.beginPath()
      ctx.arc(centerX - 35 + twitch, centerY + 45 + breathe, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // ============================================
    // JORDAN BELFORT - Detailed Portrait
    // ============================================
    const drawJordanBelfort = (time: number) => {
      const breathe = Math.sin(time * 1.5) * 2
      const confident = Math.sin(time * 0.5)

      // Slicked back dark hair
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 55 + breathe, 55, 50, 0, Math.PI * 1.1, Math.PI * 1.9)
      ctx.fill()

      // Hair shine
      ctx.strokeStyle = '#333333'
      ctx.lineWidth = 2
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX - 30 + i * 15, centerY - 90 + breathe)
        ctx.quadraticCurveTo(
          centerX - 20 + i * 15,
          centerY - 95 + breathe,
          centerX - 10 + i * 15,
          centerY - 85 + breathe
        )
        ctx.stroke()
      }

      // Face
      ctx.fillStyle = '#d4a574'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY - 40 + breathe, 52, 62, 0, 0, Math.PI * 2)
      ctx.fill()

      // Facial shadows
      ctx.fillStyle = 'rgba(150,100,70,0.2)'
      ctx.beginPath()
      ctx.ellipse(centerX - 30, centerY - 30 + breathe, 15, 30, -0.3, 0, Math.PI * 2)
      ctx.ellipse(centerX + 30, centerY - 30 + breathe, 15, 30, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Eyes - confident, slightly squinting
      ctx.fillStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.ellipse(centerX - 18, centerY - 50 + breathe, 11, 7, 0, 0, Math.PI * 2)
      ctx.ellipse(centerX + 18, centerY - 50 + breathe, 11, 7, 0, 0, Math.PI * 2)
      ctx.fill()

      // Iris
      ctx.fillStyle = '#4a6fa5'
      ctx.beginPath()
      ctx.arc(centerX - 18, centerY - 50 + breathe, 5, 0, Math.PI * 2)
      ctx.arc(centerX + 18, centerY - 50 + breathe, 5, 0, Math.PI * 2)
      ctx.fill()

      // Pupils
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX - 18, centerY - 50 + breathe, 2.5, 0, Math.PI * 2)
      ctx.arc(centerX + 18, centerY - 50 + breathe, 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Eyebrows - one raised (confident/cocky)
      ctx.strokeStyle = '#2a2a2a'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(centerX - 32, centerY - 62 + breathe)
      ctx.quadraticCurveTo(centerX - 18, centerY - 65 + breathe, centerX - 6, centerY - 60 + breathe)
      ctx.stroke()
      // Raised eyebrow
      ctx.beginPath()
      ctx.moveTo(centerX + 32, centerY - 68 + breathe + confident * 3)
      ctx.quadraticCurveTo(centerX + 18, centerY - 72 + breathe + confident * 3, centerX + 6, centerY - 65 + breathe)
      ctx.stroke()

      // Nose
      ctx.strokeStyle = 'rgba(150,100,70,0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - 45 + breathe)
      ctx.quadraticCurveTo(centerX + 5, centerY - 30 + breathe, centerX, centerY - 25 + breathe)
      ctx.stroke()

      // Confident smirk
      ctx.strokeStyle = '#8b6b5a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(centerX - 18, centerY - 10 + breathe)
      ctx.quadraticCurveTo(centerX + 5, centerY - 5 + breathe, centerX + 22, centerY - 12 + breathe)
      ctx.stroke()

      // Expensive navy suit
      ctx.fillStyle = '#1a1a3a'
      ctx.beginPath()
      ctx.moveTo(centerX - 80, centerY + 65 + breathe)
      ctx.lineTo(centerX - 40, centerY + 25 + breathe)
      ctx.lineTo(centerX, centerY + 45 + breathe)
      ctx.lineTo(centerX + 40, centerY + 25 + breathe)
      ctx.lineTo(centerX + 80, centerY + 65 + breathe)
      ctx.lineTo(centerX + 95, size)
      ctx.lineTo(centerX - 95, size)
      ctx.closePath()
      ctx.fill()

      // Suit lapels - wide, expensive
      ctx.strokeStyle = '#252550'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(centerX - 38, centerY + 30 + breathe)
      ctx.lineTo(centerX - 20, centerY + 90 + breathe)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerX + 38, centerY + 30 + breathe)
      ctx.lineTo(centerX + 20, centerY + 90 + breathe)
      ctx.stroke()

      // White shirt
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(centerX - 22, centerY + 35 + breathe)
      ctx.lineTo(centerX, centerY + 60 + breathe)
      ctx.lineTo(centerX + 22, centerY + 35 + breathe)
      ctx.closePath()
      ctx.fill()

      // Gold/yellow tie
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.moveTo(centerX - 10, centerY + 45 + breathe)
      ctx.lineTo(centerX, centerY + 110 + breathe)
      ctx.lineTo(centerX + 10, centerY + 45 + breathe)
      ctx.closePath()
      ctx.fill()

      // Tie pattern
      ctx.strokeStyle = '#daa520'
      ctx.lineWidth = 2
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX - 6, centerY + 55 + i * 12 + breathe)
        ctx.lineTo(centerX + 6, centerY + 55 + i * 12 + breathe)
        ctx.stroke()
      }
    }

    // ============================================
    // NAOMI LAPAGLIA - Detailed Portrait
    // ============================================
    const drawNaomi = (time: number) => {
      const sway = Math.sin(time * 1.2) * 2
      const blink = Math.sin(time * 0.25) > 0.93 ? 0.2 : 1

      // Long flowing blonde hair
      ctx.fillStyle = '#ffd700'

      // Main hair mass
      ctx.beginPath()
      ctx.ellipse(centerX + sway, centerY - 25, 75, 100, 0, 0, Math.PI * 2)
      ctx.fill()

      // Hair falling down sides
      ctx.beginPath()
      ctx.moveTo(centerX - 55 + sway, centerY - 80)
      ctx.quadraticCurveTo(centerX - 80 + sway, centerY + 20, centerX - 60 + sway, centerY + 100)
      ctx.lineTo(centerX - 45 + sway, centerY + 100)
      ctx.quadraticCurveTo(centerX - 60 + sway, centerY + 20, centerX - 45 + sway, centerY - 70)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(centerX + 55 + sway, centerY - 80)
      ctx.quadraticCurveTo(centerX + 80 + sway, centerY + 20, centerX + 60 + sway, centerY + 100)
      ctx.lineTo(centerX + 45 + sway, centerY + 100)
      ctx.quadraticCurveTo(centerX + 60 + sway, centerY + 20, centerX + 45 + sway, centerY - 70)
      ctx.fill()

      // Hair highlights
      ctx.strokeStyle = '#ffec8b'
      ctx.lineWidth = 3
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX - 40 + i * 20 + sway, centerY - 90)
        ctx.quadraticCurveTo(
          centerX - 50 + i * 22 + sway,
          centerY,
          centerX - 45 + i * 20 + sway,
          centerY + 80
        )
        ctx.stroke()
      }

      // Face - elegant
      ctx.fillStyle = '#f5deb3'
      ctx.beginPath()
      ctx.ellipse(centerX + sway, centerY - 40, 45, 58, 0, 0, Math.PI * 2)
      ctx.fill()

      // Cheekbone highlights
      ctx.fillStyle = 'rgba(255,200,200,0.3)'
      ctx.beginPath()
      ctx.ellipse(centerX - 25 + sway, centerY - 35, 15, 10, -0.3, 0, Math.PI * 2)
      ctx.ellipse(centerX + 25 + sway, centerY - 35, 15, 10, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Eyes - large, alluring
      ctx.fillStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.ellipse(centerX - 16 + sway, centerY - 48, 14, 10 * blink, 0, 0, Math.PI * 2)
      ctx.ellipse(centerX + 16 + sway, centerY - 48, 14, 10 * blink, 0, 0, Math.PI * 2)
      ctx.fill()

      // Iris - striking blue
      ctx.fillStyle = '#1e90ff'
      ctx.beginPath()
      ctx.arc(centerX - 16 + sway, centerY - 48, 6 * blink, 0, Math.PI * 2)
      ctx.arc(centerX + 16 + sway, centerY - 48, 6 * blink, 0, Math.PI * 2)
      ctx.fill()

      // Pupils
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX - 16 + sway, centerY - 48, 3 * blink, 0, Math.PI * 2)
      ctx.arc(centerX + 16 + sway, centerY - 48, 3 * blink, 0, Math.PI * 2)
      ctx.fill()

      // Eye highlights
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(centerX - 14 + sway, centerY - 50, 2 * blink, 0, Math.PI * 2)
      ctx.arc(centerX + 18 + sway, centerY - 50, 2 * blink, 0, Math.PI * 2)
      ctx.fill()

      // Eyelashes - glamorous
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      for (let i = 0; i < 5; i++) {
        const angle = (i / 4 - 0.5) * 0.8
        // Left eye
        ctx.beginPath()
        ctx.moveTo(centerX - 16 + Math.cos(angle - Math.PI/2) * 12 + sway, centerY - 48 + Math.sin(angle - Math.PI/2) * 8)
        ctx.lineTo(centerX - 16 + Math.cos(angle - Math.PI/2) * 18 + sway, centerY - 48 + Math.sin(angle - Math.PI/2) * 14)
        ctx.stroke()
        // Right eye
        ctx.beginPath()
        ctx.moveTo(centerX + 16 + Math.cos(angle - Math.PI/2) * 12 + sway, centerY - 48 + Math.sin(angle - Math.PI/2) * 8)
        ctx.lineTo(centerX + 16 + Math.cos(angle - Math.PI/2) * 18 + sway, centerY - 48 + Math.sin(angle - Math.PI/2) * 14)
        ctx.stroke()
      }

      // Eyebrows - arched, elegant
      ctx.strokeStyle = '#8b7355'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(centerX - 28 + sway, centerY - 58)
      ctx.quadraticCurveTo(centerX - 16 + sway, centerY - 65, centerX - 4 + sway, centerY - 60)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerX + 28 + sway, centerY - 58)
      ctx.quadraticCurveTo(centerX + 16 + sway, centerY - 65, centerX + 4 + sway, centerY - 60)
      ctx.stroke()

      // Nose - delicate
      ctx.strokeStyle = 'rgba(180,140,120,0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX + sway, centerY - 42)
      ctx.quadraticCurveTo(centerX + 3 + sway, centerY - 28, centerX + sway, centerY - 22)
      ctx.stroke()

      // Lips - full, red
      ctx.fillStyle = '#cc0033'
      // Upper lip
      ctx.beginPath()
      ctx.moveTo(centerX - 15 + sway, centerY - 12)
      ctx.quadraticCurveTo(centerX - 5 + sway, centerY - 18, centerX + sway, centerY - 14)
      ctx.quadraticCurveTo(centerX + 5 + sway, centerY - 18, centerX + 15 + sway, centerY - 12)
      ctx.quadraticCurveTo(centerX + sway, centerY - 10, centerX - 15 + sway, centerY - 12)
      ctx.fill()
      // Lower lip
      ctx.beginPath()
      ctx.moveTo(centerX - 15 + sway, centerY - 12)
      ctx.quadraticCurveTo(centerX + sway, centerY + 2, centerX + 15 + sway, centerY - 12)
      ctx.fill()

      // Lip shine
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.ellipse(centerX + sway, centerY - 6, 5, 3, 0, 0, Math.PI * 2)
      ctx.fill()

      // Neck
      ctx.fillStyle = '#f5deb3'
      ctx.beginPath()
      ctx.moveTo(centerX - 20 + sway, centerY + 15)
      ctx.lineTo(centerX - 25 + sway, centerY + 50)
      ctx.lineTo(centerX + 25 + sway, centerY + 50)
      ctx.lineTo(centerX + 20 + sway, centerY + 15)
      ctx.closePath()
      ctx.fill()

      // Elegant pink dress with low neckline
      ctx.fillStyle = '#ff1493'
      ctx.beginPath()
      ctx.moveTo(centerX - 65 + sway, centerY + 45)
      ctx.quadraticCurveTo(centerX - 30 + sway, centerY + 35, centerX + sway, centerY + 55)
      ctx.quadraticCurveTo(centerX + 30 + sway, centerY + 35, centerX + 65 + sway, centerY + 45)
      ctx.lineTo(centerX + 85 + sway, size)
      ctx.lineTo(centerX - 85 + sway, size)
      ctx.closePath()
      ctx.fill()

      // Dress shading
      ctx.fillStyle = 'rgba(200,0,100,0.3)'
      ctx.beginPath()
      ctx.ellipse(centerX - 40 + sway, centerY + 100, 25, 60, -0.2, 0, Math.PI * 2)
      ctx.ellipse(centerX + 40 + sway, centerY + 100, 25, 60, 0.2, 0, Math.PI * 2)
      ctx.fill()

      // Gold necklace
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX + sway, centerY + 25, 35, 0.2, Math.PI - 0.2)
      ctx.stroke()

      // Diamond pendant
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(centerX + sway, centerY + 55)
      ctx.lineTo(centerX - 10 + sway, centerY + 68)
      ctx.lineTo(centerX + sway, centerY + 85)
      ctx.lineTo(centerX + 10 + sway, centerY + 68)
      ctx.closePath()
      ctx.fill()

      // Diamond sparkle
      ctx.fillStyle = '#87ceeb'
      ctx.beginPath()
      ctx.arc(centerX - 3 + sway, centerY + 65, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Main animation loop
    const animate = () => {
      frameRef.current += 0.016
      const time = frameRef.current

      // Clear canvas
      ctx.clearRect(0, 0, size, size)

      // Background glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, size / 2
      )
      glowGradient.addColorStop(0, character.primaryColor + '40')
      glowGradient.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGradient
      ctx.fillRect(0, 0, size, size)

      // Draw appropriate character
      ctx.shadowBlur = 20
      ctx.shadowColor = character.primaryColor

      switch (character.id) {
        case 'wick': drawJohnWick(time); break
        case 'bart': drawBartSimpson(time); break
        case 'joker': drawJoker(time); break
        case 'wolf': drawJordanBelfort(time); break
        case 'duchess': drawNaomi(time); break
      }

      ctx.shadowBlur = 0

      // Scanlines overlay
      if (showScanlines) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)'
        for (let y = 0; y < size; y += 3) {
          ctx.fillRect(0, y, size, 1)
        }

        // Moving scan line
        const scanY = (time * 80) % size
        ctx.strokeStyle = character.primaryColor + '40'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, scanY)
        ctx.lineTo(size, scanY)
        ctx.stroke()
      }

      // Glitch effect
      if (showGlitch && Math.random() > 0.96) {
        const glitchY = Math.random() * size
        const glitchH = Math.random() * 25 + 5
        ctx.fillStyle = character.primaryColor + '50'
        ctx.fillRect(0, glitchY, size, glitchH)

        // RGB split glitch
        if (Math.random() > 0.5) {
          ctx.fillStyle = 'rgba(255,0,0,0.2)'
          ctx.fillRect(-5, glitchY, size, glitchH)
          ctx.fillStyle = 'rgba(0,255,255,0.2)'
          ctx.fillRect(5, glitchY, size, glitchH)
        }
      }

      if (animate) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [character, size, showGlitch, showScanlines, animate])

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.6 }}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 blur-3xl opacity-60"
        style={{ background: character.primaryColor }}
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="relative z-10"
      />

      {/* Frame border */}
      <div
        className="absolute inset-0 border-2 pointer-events-none z-20"
        style={{ borderColor: character.primaryColor }}
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 z-20" style={{ borderColor: character.primaryColor }} />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 z-20" style={{ borderColor: character.primaryColor }} />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 z-20" style={{ borderColor: character.primaryColor }} />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 z-20" style={{ borderColor: character.primaryColor }} />
    </motion.div>
  )
}

// ============================================
// CHARACTER DOSSIER CARD
// ============================================

export function CharacterDossierCard({
  character,
  isActive = true,
  showStats = true,
  onComplete
}: {
  character: Character
  isActive?: boolean
  showStats?: boolean
  onComplete?: () => void
}) {
  const [revealStage, setRevealStage] = useState(0)

  useEffect(() => {
    if (!isActive) return

    const stages = [500, 800, 1200, 1600, 2000]
    const timers = stages.map((delay, i) =>
      setTimeout(() => setRevealStage(i + 1), delay)
    )

    const completeTimer = setTimeout(() => {
      onComplete?.()
    }, 4500)

    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(completeTimer)
    }
  }, [isActive, onComplete])

  return (
    <motion.div
      className="flex items-center gap-12 p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
    >
      {/* Portrait */}
      <CharacterPortraitCanvas character={character} size={350} />

      {/* Info Panel */}
      <div className="flex-1 space-y-6">
        {/* Codename */}
        <AnimatePresence>
          {revealStage >= 1 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring' }}
            >
              <p
                className="text-sm font-mono tracking-[0.4em] mb-2"
                style={{ color: character.primaryColor }}
              >
                CODENAME
              </p>
              <h1
                className="text-5xl font-bold font-mono"
                style={{
                  color: '#ffffff',
                  textShadow: `0 0 30px ${character.primaryColor}`
                }}
              >
                {character.codename}
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real name */}
        <AnimatePresence>
          {revealStage >= 2 && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-2xl font-mono text-neutral-400">
                {character.name}
              </p>
              <p
                className="text-sm font-mono mt-1"
                style={{ color: character.secondaryColor }}
              >
                "{character.alias}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quote */}
        <AnimatePresence>
          {revealStage >= 3 && (
            <motion.blockquote
              className="border-l-4 pl-4 py-2 max-w-lg"
              style={{ borderColor: character.primaryColor }}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-lg font-mono italic text-white/80">
                "{character.quote}"
              </p>
            </motion.blockquote>
          )}
        </AnimatePresence>

        {/* Stats */}
        <AnimatePresence>
          {revealStage >= 4 && showStats && (
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="border rounded p-3"
                style={{
                  borderColor: character.primaryColor + '50',
                  background: character.primaryColor + '10'
                }}
              >
                <p className="text-xs text-neutral-500 font-mono">SPECIALTY</p>
                <p
                  className="text-sm font-mono font-bold"
                  style={{ color: character.primaryColor }}
                >
                  {character.specialty}
                </p>
              </div>
              <div
                className="border rounded p-3"
                style={{
                  borderColor: '#ff004050',
                  background: '#ff004010'
                }}
              >
                <p className="text-xs text-neutral-500 font-mono">THREAT LEVEL</p>
                <p className="text-sm font-mono font-bold text-red-500">
                  {character.threatLevel}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Role badge */}
        <AnimatePresence>
          {revealStage >= 5 && (
            <motion.div
              className="inline-flex items-center gap-3 px-6 py-3 rounded border font-mono"
              style={{
                borderColor: character.primaryColor,
                background: character.primaryColor + '15',
                boxShadow: `0 0 30px ${character.primaryColor}30`
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: character.primaryColor }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <span style={{ color: character.primaryColor }}>
                OPERATIVE ACTIVE
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

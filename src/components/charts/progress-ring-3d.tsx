'use client'

import { useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

interface ProgressRing3DProps {
  value: number // 0-100
  label?: string
  sublabel?: string
  color?: 'amber' | 'blue' | 'purple' | 'green'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const colorValues = {
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#22c55e',
}

const sizeMap = {
  sm: { height: 150, scale: 0.8 },
  md: { height: 200, scale: 1 },
  lg: { height: 280, scale: 1.3 },
}

function AnimatedTorus({
  progress,
  color,
  scale,
}: {
  progress: number
  color: string
  scale: number
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const bgRingRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useFrame((state, delta) => {
    // Animate progress
    if (animatedProgress < progress) {
      setAnimatedProgress((prev) => Math.min(prev + delta * 50, progress))
    }

    // Subtle rotation
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.1
    }

    // Pulsing glow
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1
      glowRef.current.scale.setScalar(pulse * scale)
    }
  })

  const progressRadians = (animatedProgress / 100) * Math.PI * 2

  return (
    <group scale={scale}>
      {/* Background ring */}
      <mesh ref={bgRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.15, 16, 100]} />
        <meshStandardMaterial
          color="#1f1f1f"
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Progress ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, -Math.PI / 2]}>
        <torusGeometry args={[1, 0.18, 16, 100, progressRadians]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Glow effect */}
      <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.3, 8, 50]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Center text */}
      <Text
        position={[0, 0.1, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-bold.woff"
      >
        {Math.round(animatedProgress)}
      </Text>
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.15}
        color="#888888"
        anchorX="center"
        anchorY="middle"
      >
        SCORE
      </Text>
    </group>
  )
}

function Scene({ value, color, scale }: { value: number; color: string; scale: number }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.3} color={color} />
      <AnimatedTorus progress={value} color={color} scale={scale} />
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
    </div>
  )
}

export function ProgressRing3D({
  value,
  label,
  sublabel,
  color = 'amber',
  size = 'md',
  className,
}: ProgressRing3DProps) {
  const { height, scale } = sizeMap[size]
  const colorValue = colorValues[color]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('relative', className)}
      style={{ height }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 45 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <Scene value={value} color={colorValue} scale={scale} />
        </Canvas>
      </Suspense>

      {(label || sublabel) && (
        <div className="absolute bottom-0 left-0 right-0 text-center">
          {label && (
            <p className="text-sm font-medium text-foreground">{label}</p>
          )}
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Simple 2D fallback for SSR or non-WebGL environments
export function ProgressRing2DFallback({
  value,
  label,
  color = 'amber',
  size = 'md',
  className,
}: Omit<ProgressRing3DProps, 'sublabel'>) {
  const { height } = sizeMap[size]
  const colorValue = colorValues[color]
  const strokeWidth = 12
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('relative flex items-center justify-center', className)}
      style={{ height }}
    >
      <svg width={radius * 2 + strokeWidth * 2} height={radius * 2 + strokeWidth * 2}>
        {/* Background */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress */}
        <motion.circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={colorValue}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 8px ${colorValue}50)`,
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
        {/* Center text */}
        <text
          x={radius + strokeWidth}
          y={radius + strokeWidth}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-2xl font-bold"
        >
          {value}
        </text>
      </svg>
      {label && (
        <p className="absolute bottom-2 text-sm font-medium text-muted-foreground">
          {label}
        </p>
      )}
    </motion.div>
  )
}

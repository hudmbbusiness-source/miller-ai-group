'use client'

import { useRef, useState, Suspense, useMemo } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { Text, RoundedBox, Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

interface BarData {
  label: string
  value: number
  color?: string
}

interface BarChart3DProps {
  data: BarData[]
  height?: number
  showLabels?: boolean
  showValues?: boolean
  maxValue?: number
  className?: string
  colorScheme?: 'gradient' | 'single'
  baseColor?: string
}

const defaultColors = [
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
]

function Bar3D({
  position,
  height,
  color,
  label,
  value,
  index,
  showLabel,
  showValue,
}: {
  position: [number, number, number]
  height: number
  color: string
  label: string
  value: number
  index: number
  showLabel: boolean
  showValue: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [animatedHeight, setAnimatedHeight] = useState(0)

  useFrame((state, delta) => {
    // Animate height on mount
    if (animatedHeight < height) {
      setAnimatedHeight((prev) => Math.min(prev + delta * 3, height))
    }

    // Hover effect
    if (meshRef.current) {
      const targetY = hovered ? 0.1 : 0
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        animatedHeight / 2 + targetY,
        0.1
      )

      // Subtle breathing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.02
      meshRef.current.scale.x = hovered ? 1.1 : scale
      meshRef.current.scale.z = hovered ? 1.1 : scale
    }
  })

  return (
    <group position={position}>
      {/* Bar */}
      <RoundedBox
        ref={meshRef}
        args={[0.6, animatedHeight, 0.6]}
        radius={0.05}
        smoothness={4}
        position={[0, animatedHeight / 2, 0]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.4 : 0.15}
          metalness={0.3}
          roughness={0.4}
        />
      </RoundedBox>

      {/* Glow under bar */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Label */}
      {showLabel && (
        <Text
          position={[0, -0.3, 0]}
          fontSize={0.2}
          color="#888888"
          anchorX="center"
          anchorY="top"
          maxWidth={1}
        >
          {label}
        </Text>
      )}

      {/* Value on top */}
      {showValue && animatedHeight > 0.1 && (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.2}>
          <Text
            position={[0, animatedHeight + 0.3, 0]}
            fontSize={0.25}
            color="white"
            anchorX="center"
            anchorY="bottom"
          >
            {value}
          </Text>
        </Float>
      )}
    </group>
  )
}

function Scene({
  data,
  maxValue,
  showLabels,
  showValues,
  colorScheme,
  baseColor,
}: {
  data: BarData[]
  maxValue: number
  showLabels: boolean
  showValues: boolean
  colorScheme: 'gradient' | 'single'
  baseColor: string
}) {
  const normalizedData = useMemo(() => {
    const max = maxValue || Math.max(...data.map((d) => d.value))
    return data.map((d, i) => ({
      ...d,
      normalizedValue: (d.value / max) * 3, // Max height of 3 units
      color:
        d.color ||
        (colorScheme === 'single' ? baseColor : defaultColors[i % defaultColors.length]),
    }))
  }, [data, maxValue, colorScheme, baseColor])

  const totalWidth = data.length * 1.2
  const startX = -totalWidth / 2 + 0.6

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#f59e0b" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[totalWidth + 2, 4]} />
        <meshStandardMaterial
          color="#0a0a0a"
          transparent
          opacity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Grid lines */}
      <gridHelper
        args={[totalWidth + 2, 10, '#1f1f1f', '#1f1f1f']}
        position={[0, 0.01, 0]}
      />

      {/* Bars */}
      {normalizedData.map((item, index) => (
        <Bar3D
          key={item.label}
          position={[startX + index * 1.2, 0, 0]}
          height={item.normalizedValue}
          color={item.color}
          label={item.label}
          value={item.value}
          index={index}
          showLabel={showLabels}
          showValue={showValues}
        />
      ))}
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-4 bg-amber-500/50 rounded"
            initial={{ height: 20 }}
            animate={{ height: [20, 60, 20] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function BarChart3D({
  data,
  height = 300,
  showLabels = true,
  showValues = true,
  maxValue,
  className,
  colorScheme = 'gradient',
  baseColor = '#f59e0b',
}: BarChart3DProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('relative rounded-xl overflow-hidden', className)}
      style={{ height }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 4, 8], fov: 45 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
          shadows
        >
          <Scene
            data={data}
            maxValue={maxValue || 0}
            showLabels={showLabels}
            showValues={showValues}
            colorScheme={colorScheme}
            baseColor={baseColor}
          />
        </Canvas>
      </Suspense>
    </motion.div>
  )
}

// Simple 2D fallback with animations
export function BarChart2DFallback({
  data,
  height = 200,
  className,
}: {
  data: BarData[]
  height?: number
  className?: string
}) {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('relative', className)}
      style={{ height }}
    >
      <div className="flex items-end justify-around h-full gap-2 px-4 pb-8">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100
          return (
            <div key={item.label} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs font-medium text-foreground">
                {item.value}
              </span>
              <motion.div
                className="w-full rounded-t-md"
                style={{
                  backgroundColor: item.color || defaultColors[index % defaultColors.length],
                  boxShadow: `0 0 20px ${item.color || defaultColors[index % defaultColors.length]}40`,
                }}
                initial={{ height: 0 }}
                animate={{ height: `${barHeight}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
              <span className="text-xs text-muted-foreground truncate max-w-full">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

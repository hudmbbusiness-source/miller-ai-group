'use client'

import { useRef, useState, Suspense, useMemo } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

interface DonutData {
  name: string
  value: number
  color: string
}

interface DonutChart3DProps {
  data: DonutData[]
  height?: number
  centerValue?: string | number
  centerLabel?: string
  className?: string
}

function DonutSegment({
  startAngle,
  endAngle,
  color,
  index,
  label,
  value,
  total,
}: {
  startAngle: number
  endAngle: number
  color: string
  index: number
  label: string
  value: number
  total: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [animatedEnd, setAnimatedEnd] = useState(startAngle)

  const shape = useMemo(() => {
    const s = new THREE.Shape()
    const innerRadius = 0.6
    const outerRadius = 1.2

    // Outer arc
    s.absarc(0, 0, outerRadius, startAngle, animatedEnd, false)
    // Line to inner arc
    s.lineTo(
      Math.cos(animatedEnd) * innerRadius,
      Math.sin(animatedEnd) * innerRadius
    )
    // Inner arc (reverse direction)
    s.absarc(0, 0, innerRadius, animatedEnd, startAngle, true)
    s.closePath()

    return s
  }, [startAngle, animatedEnd])

  const extrudeSettings = useMemo(
    () => ({
      steps: 1,
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    }),
    []
  )

  useFrame((state, delta) => {
    // Animate segment growth
    if (animatedEnd < endAngle) {
      setAnimatedEnd((prev) => Math.min(prev + delta * 3, endAngle))
    }

    // Hover lift effect
    if (meshRef.current) {
      const targetZ = hovered ? 0.15 : 0
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        targetZ,
        0.1
      )

      // Subtle rotation
      meshRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.02
    }
  })

  const midAngle = (startAngle + endAngle) / 2
  const labelRadius = 1.6
  const labelX = Math.cos(midAngle) * labelRadius
  const labelY = Math.sin(midAngle) * labelRadius

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[Math.PI / 2, 0, 0]}
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
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Label */}
      {hovered && (
        <Float speed={4} floatIntensity={0.1}>
          <Text
            position={[labelX, 0.3, labelY]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
          <Text
            position={[labelX, 0.1, labelY]}
            fontSize={0.12}
            color="#888888"
            anchorX="center"
            anchorY="middle"
          >
            {value} ({Math.round((value / total) * 100)}%)
          </Text>
        </Float>
      )}
    </group>
  )
}

function Scene({
  data,
  centerValue,
  centerLabel,
}: {
  data: DonutData[]
  centerValue?: string | number
  centerLabel?: string
}) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  const segments = useMemo(() => {
    let currentAngle = -Math.PI / 2 // Start from top
    return data.map((item) => {
      const startAngle = currentAngle
      const angle = (item.value / total) * Math.PI * 2
      currentAngle += angle
      return {
        ...item,
        startAngle,
        endAngle: currentAngle,
      }
    })
  }, [data, total])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.7} />
      <pointLight position={[-3, 3, 3]} intensity={0.4} color="#f59e0b" />
      <pointLight position={[3, -3, 3]} intensity={0.3} color="#8b5cf6" />

      {/* Segments */}
      <group rotation={[0.3, 0, 0]}>
        {segments.map((segment, index) => (
          <DonutSegment
            key={segment.name}
            startAngle={segment.startAngle}
            endAngle={segment.endAngle}
            color={segment.color}
            index={index}
            label={segment.name}
            value={segment.value}
            total={total}
          />
        ))}

        {/* Center text */}
        {centerValue !== undefined && (
          <>
            <Text
              position={[0, 0.2, 0]}
              fontSize={0.35}
              color="white"
              anchorX="center"
              anchorY="middle"
              rotation={[-0.3, 0, 0]}
            >
              {centerValue}
            </Text>
            {centerLabel && (
              <Text
                position={[0, -0.1, 0]}
                fontSize={0.12}
                color="#888888"
                anchorX="center"
                anchorY="middle"
                rotation={[-0.3, 0, 0]}
              >
                {centerLabel}
              </Text>
            )}
          </>
        )}
      </group>
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        className="w-20 h-20 rounded-full border-4 border-amber-500/30"
        style={{ borderTopColor: '#f59e0b' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

export function DonutChart3D({
  data,
  height = 280,
  centerValue,
  centerLabel,
  className,
}: DonutChart3DProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn('relative rounded-xl overflow-hidden', className)}
      style={{ height }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 3, 4], fov: 45 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <Scene data={data} centerValue={centerValue} centerLabel={centerLabel} />
        </Canvas>
      </Suspense>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-center gap-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: item.color,
                boxShadow: `0 0 8px ${item.color}60`,
              }}
            />
            <span className="text-xs text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// 2D Fallback
export function DonutChart2DFallback({
  data,
  height = 200,
  centerValue,
  centerLabel,
  className,
}: DonutChart3DProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let cumulativePercent = 0

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2)
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2)
    return [x, y]
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('relative flex items-center justify-center', className)}
      style={{ height }}
    >
      <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full max-w-[200px]">
        {data.map((item, index) => {
          const percent = item.value / total
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent)
          cumulativePercent += percent
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent)
          const largeArcFlag = percent > 0.5 ? 1 : 0

          const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L ${endX * 0.6} ${endY * 0.6}`,
            `A 0.6 0.6 0 ${largeArcFlag} 0 ${startX * 0.6} ${startY * 0.6}`,
            `Z`,
          ].join(' ')

          return (
            <motion.path
              key={item.name}
              d={pathData}
              fill={item.color}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              style={{ filter: `drop-shadow(0 0 4px ${item.color}50)` }}
            />
          )
        })}
        {centerValue !== undefined && (
          <>
            <text
              x="0"
              y="-0.05"
              textAnchor="middle"
              className="fill-foreground text-[0.25px] font-bold"
            >
              {centerValue}
            </text>
            {centerLabel && (
              <text
                x="0"
                y="0.15"
                textAnchor="middle"
                className="fill-muted-foreground text-[0.1px]"
              >
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
    </motion.div>
  )
}

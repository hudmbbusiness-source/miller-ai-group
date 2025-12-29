'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface HackerDashboardClientProps {
  children: ReactNode
}

export function HackerDashboardClient({ children }: HackerDashboardClientProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {children}
    </motion.div>
  )
}

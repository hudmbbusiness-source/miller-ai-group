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
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Animated corner decorations */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute top-0 left-0 w-20 h-px bg-gradient-to-r from-cyan-500 to-transparent origin-left"
          />
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute top-0 left-0 h-20 w-px bg-gradient-to-b from-cyan-500 to-transparent origin-top"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute bottom-0 right-0 w-20 h-px bg-gradient-to-l from-cyan-500 to-transparent origin-right"
          />
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute bottom-0 right-0 h-20 w-px bg-gradient-to-t from-cyan-500 to-transparent origin-bottom"
          />
        </>
      )}

      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </motion.div>
  )
}

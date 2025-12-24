'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-amber-500/5" />

      {/* Bouncing logo */}
      <div className="relative">
        <motion.div
          animate={{
            y: [0, -40, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: [0.5, 0, 0.5, 1], // Bounce easing
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src="/logos/miller-ai-group.svg"
              alt="Loading..."
              width={80}
              height={80}
              className="w-20 h-20"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Shadow that scales with bounce */}
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-foreground/10 rounded-full blur-sm"
          animate={{
            scaleX: [1, 0.7, 1],
            opacity: [0.3, 0.15, 0.3],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Loading text */}
      <motion.p
        className="absolute bottom-1/3 text-sm text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading...
      </motion.p>
    </div>
  )
}

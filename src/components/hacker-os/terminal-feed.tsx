'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'success' | 'warning' | 'error' | 'system'
  message: string
  source?: string
}

interface TerminalFeedProps {
  logs: LogEntry[]
  maxHeight?: string
  autoScroll?: boolean
  showTimestamp?: boolean
  colorMode?: 'green' | 'cyan' | 'amber'
  className?: string
  title?: string
}

const levelColors = {
  info: 'text-cyan-400',
  success: 'text-green-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  system: 'text-purple-400',
}

const levelPrefixes = {
  info: '[INFO]',
  success: '[OK]',
  warning: '[WARN]',
  error: '[ERR]',
  system: '[SYS]',
}

const colorModeStyles = {
  green: 'text-green-400',
  cyan: 'text-cyan-400',
  amber: 'text-amber-400',
}

export function TerminalFeed({
  logs,
  maxHeight = '300px',
  autoScroll = true,
  showTimestamp = true,
  colorMode = 'green',
  className,
  title = 'SYSTEM LOG',
}: TerminalFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)

  // Cursor blink effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && !isPaused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll, isPaused])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className={cn(
      'relative rounded-lg overflow-hidden',
      'bg-black/80 border border-green-500/30',
      'font-mono text-sm',
      className
    )}>
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-green-500/20">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className={cn('text-xs uppercase tracking-wider', colorModeStyles[colorMode])}>
            {title}
          </span>
        </div>
        <button
          onClick={() => setIsPaused(prev => !prev)}
          className={cn(
            'text-xs px-2 py-1 rounded border transition-colors',
            isPaused
              ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
              : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
          )}
        >
          {isPaused ? 'PAUSED' : 'LIVE'}
        </button>
      </div>

      {/* Terminal content */}
      <div
        ref={containerRef}
        className="overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-green-500/30 scrollbar-track-transparent"
        style={{ maxHeight }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence>
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 mb-1 leading-relaxed"
            >
              {showTimestamp && (
                <span className="text-neutral-500 flex-shrink-0">
                  [{formatTime(log.timestamp)}]
                </span>
              )}
              <span className={cn('flex-shrink-0', levelColors[log.level])}>
                {levelPrefixes[log.level]}
              </span>
              {log.source && (
                <span className="text-purple-400 flex-shrink-0">
                  [{log.source}]
                </span>
              )}
              <span className={colorModeStyles[colorMode]}>
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Cursor */}
        <div className={cn(
          'inline-block w-2 h-4 ml-1',
          colorModeStyles[colorMode],
          cursorVisible ? 'bg-current' : 'bg-transparent'
        )} />
      </div>

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.05) 2px, rgba(0,255,65,0.05) 4px)',
        }}
      />
    </div>
  )
}

// Helper to generate system logs
export function generateSystemLog(
  message: string,
  level: LogEntry['level'] = 'info',
  source?: string
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    level,
    message,
    source,
  }
}

// Preset system messages for takeover sequence
export const TAKEOVER_LOGS: Omit<LogEntry, 'id' | 'timestamp'>[] = [
  { level: 'system', message: 'Initializing secure connection...', source: 'BOOT' },
  { level: 'info', message: 'Loading cryptographic modules...', source: 'CRYPTO' },
  { level: 'success', message: 'Encryption keys verified', source: 'CRYPTO' },
  { level: 'info', message: 'Establishing neural network link...', source: 'AI' },
  { level: 'success', message: 'AI cores online', source: 'AI' },
  { level: 'system', message: 'Loading user credentials...', source: 'AUTH' },
  { level: 'success', message: 'GitHub OAuth verified', source: 'AUTH' },
  { level: 'info', message: 'Synchronizing database...', source: 'DB' },
  { level: 'success', message: 'Supabase connection established', source: 'DB' },
  { level: 'system', message: 'Loading Miller AI Group modules...', source: 'CORE' },
  { level: 'info', message: 'Kachow AI: ONLINE', source: 'TOOLS' },
  { level: 'info', message: 'StuntMan AI: ONLINE', source: 'TOOLS' },
  { level: 'info', message: 'BrainBox: ONLINE', source: 'TOOLS' },
  { level: 'success', message: 'All systems operational', source: 'CORE' },
  { level: 'system', message: 'MILLER AI GROUP SYSTEM ONLINE', source: 'MAIN' },
]

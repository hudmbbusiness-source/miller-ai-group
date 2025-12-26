'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Target,
  Brain,
  Grid3X3,
  Link2,
  FolderOpen,
  Settings,
  ChevronUp,
  X,
  Zap,
  Video,
  ShoppingBag,
  FileCheck,
} from 'lucide-react'

const primaryNav = [
  { href: '/app', label: 'Home', icon: LayoutDashboard },
  { href: '/app/goals', label: 'Goals', icon: Target },
  { href: '/app/tools/brainbox', label: 'AI', icon: Brain },
  { href: '/app/notes', label: 'Notes', icon: FileText },
]

const expandedNav = [
  { href: '/app/boards', label: 'Boards', icon: Grid3X3 },
  { href: '/app/assets', label: 'Assets', icon: ShoppingBag },
  { href: '/app/zuckerberg', label: 'Zuckerberg', icon: FileCheck },
  { href: '/app/tools/kachow', label: 'Kachow AI', icon: Zap },
  { href: '/app/tools/stuntman', label: 'Stuntman', icon: Video },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Expanded Menu Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setIsExpanded(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border rounded-t-2xl safe-area-bottom"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">More Options</span>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2.5 -mr-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-muted rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of options */}
              <div className="grid grid-cols-4 gap-2 p-4 max-h-[50vh] overflow-y-auto">
                {expandedNav.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsExpanded(false)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 p-3 min-h-[72px] rounded-xl transition-colors active:scale-95',
                        active
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-center leading-tight truncate w-full">
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-[68px] px-2">
          {primaryNav.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] min-h-[52px] rounded-xl transition-colors relative active:scale-95',
                  active
                    ? 'text-amber-500'
                    : 'text-muted-foreground active:text-foreground'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="mobileNavActive"
                    className="absolute inset-0 bg-amber-500/10 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className="w-5 h-5 relative z-10" />
                <span className="text-[11px] font-medium relative z-10">{item.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setIsExpanded(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] min-h-[52px] rounded-xl transition-colors active:scale-95',
              'text-muted-foreground active:text-foreground active:bg-muted/50'
            )}
          >
            <ChevronUp className="w-5 h-5" />
            <span className="text-[11px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SOCIAL_LINKS } from '@/types'
import { GlobalSearch } from './global-search'
import { KeyboardShortcutsProvider, KeyboardShortcutsButton } from './keyboard-shortcuts'
import { OnboardingDialog } from './onboarding'
import { PasswordGate } from './password-gate'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import {
  AudioEngineProvider,
  useAudioEngine,
  DataStreamBackground,
} from '@/components/hacker-os'
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Instagram,
  Linkedin,
  Menu,
  Shield,
  Zap,
  BarChart3,
  Brain,
  Rocket,
  Code2,
  Volume2,
  VolumeX,
  Terminal,
  Activity,
  Cpu,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, color: 'cyan' },
  { href: '/app/launch-pad', label: 'Launch Pad', icon: Rocket, color: 'purple' },
  { href: '/app/workspace', label: 'Workspace', icon: FileText, color: 'green' },
  { href: '/app/settings', label: 'Settings', icon: Settings, color: 'amber' },
]

const toolItems = [
  { href: '/app/tools/playground', label: 'Code Playground', icon: Code2, color: 'violet' },
  { href: '/app/tools/kachow', label: 'Kachow AI', icon: Zap, color: 'amber' },
  { href: '/app/tools/stuntman', label: 'Stuntman AI', icon: BarChart3, color: 'emerald' },
  { href: '/app/tools/brainbox', label: 'BrainBox', icon: Brain, color: 'blue' },
]

const adminItems = [
  { href: '/app/admin/verify', label: 'System Verify', icon: Shield, color: 'red' },
]

const colorClasses: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    glow: '0 0 20px rgba(0, 255, 255, 0.3)',
  },
  green: {
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    glow: '0 0 20px rgba(0, 255, 65, 0.3)',
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    glow: '0 0 20px rgba(191, 0, 255, 0.3)',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: '0 0 20px rgba(255, 191, 0, 0.3)',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: '0 0 20px rgba(16, 185, 129, 0.3)',
  },
  blue: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: '0 0 20px rgba(59, 130, 246, 0.3)',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: '0 0 20px rgba(239, 68, 68, 0.3)',
  },
}

// System status bar component
function SystemStatusBar() {
  const [time, setTime] = useState(new Date())
  const [cpuLoad, setCpuLoad] = useState(23)
  const [memoryUsage, setMemoryUsage] = useState(47)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
      // Simulate fluctuating system metrics
      setCpuLoad(prev => Math.max(10, Math.min(90, prev + (Math.random() - 0.5) * 10)))
      setMemoryUsage(prev => Math.max(30, Math.min(80, prev + (Math.random() - 0.5) * 5)))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-4 text-xs font-mono text-neutral-500">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-cyan-400" />
        <span className="text-cyan-400">{cpuLoad.toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Cpu className="w-3 h-3 text-green-400" />
        <span className="text-green-400">{memoryUsage.toFixed(0)}%</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <Terminal className="w-3 h-3 text-purple-400" />
        <span className="text-purple-400">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </div>
  )
}

// Audio control component
function AudioControl() {
  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    return null
  }

  const { isMuted, toggleMute, initialize } = audioEngine

  const handleClick = async () => {
    await initialize()
    toggleMute()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        "min-w-[44px] min-h-[44px] transition-all duration-200",
        isMuted
          ? "text-neutral-500 hover:text-neutral-300"
          : "text-cyan-400 hover:text-cyan-300"
      )}
    >
      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </Button>
  )
}

interface HubLayoutProps {
  children: React.ReactNode
  user: User
}

function HubLayoutContent({ children, user }: HubLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()

  useKeyboardShortcuts()

  let audioEngine: ReturnType<typeof useAudioEngine> | null = null
  try {
    audioEngine = useAudioEngine()
  } catch {
    // Audio engine not available
  }

  const handleLogout = async () => {
    audioEngine?.playEffect('button_click')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  const handleNavClick = () => {
    audioEngine?.playEffect('button_click')
  }

  const handleNavHover = () => {
    audioEngine?.playEffect('button_hover')
  }

  const pageTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: 'easeOut' as const }

  const pageVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
      }

  // Navigation content
  const NavContent = () => (
    <ScrollArea className="flex-1 py-4">
      <nav className="px-3 space-y-1">
        {/* Main nav items */}
        {navItems.map((item, index) => {
          const active = isActive(item.href)
          const colors = colorClasses[item.color]
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onMouseEnter={handleNavHover}
            >
              <Link
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono',
                  'transition-all duration-200 relative min-h-[44px]',
                  'border',
                  active
                    ? cn(colors.bg, colors.text, colors.border)
                    : 'border-transparent text-neutral-400 hover:bg-white/5 hover:text-white hover:border-white/10'
                )}
                style={{
                  boxShadow: active ? colors.glow : 'none',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full", colors.text.replace('text-', 'bg-'))}
                  />
                )}
                <item.icon className={cn("w-5 h-5 flex-shrink-0", active && colors.text)} />
                <span className="uppercase tracking-wider text-xs">{item.label}</span>
                {active && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn("ml-auto w-2 h-2 rounded-full", colors.text.replace('text-', 'bg-'))}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}

        {/* Tools Section */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <p className="px-3 mb-2 text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest">
            [ TOOLS ]
          </p>
          {toolItems.map((item, index) => {
            const active = isActive(item.href)
            const colors = colorClasses[item.color]
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navItems.length + index) * 0.05 }}
                onMouseEnter={handleNavHover}
              >
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono',
                    'transition-all duration-200 relative min-h-[44px]',
                    'border',
                    active
                      ? cn(colors.bg, colors.text, colors.border)
                      : 'border-transparent text-neutral-400 hover:bg-white/5 hover:text-white hover:border-white/10'
                  )}
                  style={{
                    boxShadow: active ? colors.glow : 'none',
                  }}
                >
                  {active && (
                    <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full", colors.text.replace('text-', 'bg-'))} />
                  )}
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="uppercase tracking-wider text-xs">{item.label}</span>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Admin Section */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <p className="px-3 mb-2 text-[10px] font-mono text-red-500/50 uppercase tracking-widest">
            [ ADMIN ]
          </p>
          {adminItems.map((item) => {
            const active = isActive(item.href)
            const colors = colorClasses[item.color]
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono',
                  'transition-all duration-200 relative min-h-[44px]',
                  'border',
                  active
                    ? cn(colors.bg, colors.text, colors.border)
                    : 'border-transparent text-neutral-400 hover:bg-white/5 hover:text-white hover:border-white/10'
                )}
                style={{
                  boxShadow: active ? colors.glow : 'none',
                }}
              >
                {active && (
                  <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full", colors.text.replace('text-', 'bg-'))} />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="uppercase tracking-wider text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </ScrollArea>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hacker OS Background */}
      <DataStreamBackground intensity="low" color="cyan" showPolygons={!prefersReducedMotion} />

      {/* Scanlines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
        }}
      />

      <div className="relative flex flex-col min-h-screen z-10">
        {/* Header */}
        <header className="h-14 sm:h-16 border-b border-cyan-500/20 bg-black/80 backdrop-blur-2xl flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-w-[44px] min-h-[44px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/30"
                  onClick={handleNavClick}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-black/95 border-r border-cyan-500/30">
                <SheetHeader className="p-6 border-b border-cyan-500/20 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-cyan-500/30 rounded-lg blur-lg" />
                      <Image
                        src="/logos/miller-ai-group.png"
                        alt="Miller AI Group"
                        width={32}
                        height={32}
                        className="relative rounded-lg"
                      />
                    </motion.div>
                    <SheetTitle className="text-lg font-mono font-bold text-left text-cyan-400">
                      MILLER AI GROUP
                    </SheetTitle>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <NavContent />
                </div>
                <div className="p-4 border-t border-cyan-500/20 flex-shrink-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 min-h-[44px] font-mono"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    LOGOUT
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/app" className="hidden sm:flex items-center gap-2 group" onClick={handleNavClick}>
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
              >
                <div className="absolute inset-0 bg-cyan-500/30 rounded-lg blur-lg" />
                <Image
                  src="/logos/miller-ai-group.png"
                  alt="Miller AI Group"
                  width={28}
                  height={28}
                  className="relative rounded-lg"
                />
              </motion.div>
              <span className="text-lg font-mono font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors tracking-wider">
                MILLER AI
              </span>
            </Link>

            <div className="sm:hidden">
              <h1 className="font-mono font-semibold text-sm text-cyan-400">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'OPERATOR'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <SystemStatusBar />
            <div className="w-px h-6 bg-cyan-500/20 mx-2 hidden sm:block" />
            <GlobalSearch />
            <KeyboardShortcutsButton />
            <AudioControl />
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-cyan-400 transition-colors hidden sm:flex"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-cyan-400 transition-colors hidden sm:flex"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 sm:ml-2 hidden lg:flex min-h-[44px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 font-mono"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              LOGOUT
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={pageVariants.initial}
              animate={pageVariants.animate}
              exit={pageVariants.exit}
              transition={pageTransition}
              className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer status bar */}
        <footer className="h-8 border-t border-cyan-500/20 bg-black/80 backdrop-blur-xl flex items-center justify-between px-4 text-[10px] font-mono text-neutral-500">
          <div className="flex items-center gap-4">
            <span className="text-cyan-400">[SYS]</span>
            <span>MILLER AI GROUP OS v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-400">● ONLINE</span>
            <span>SESSION: {Date.now().toString(16).slice(-8).toUpperCase()}</span>
          </div>
        </footer>
      </div>

      <OnboardingDialog />
    </div>
  )
}

export function HubLayout({ children, user }: HubLayoutProps) {
  return (
    <PasswordGate>
      <KeyboardShortcutsProvider>
        <AudioEngineProvider>
          <HubLayoutContent user={user}>{children}</HubLayoutContent>
        </AudioEngineProvider>
      </KeyboardShortcutsProvider>
    </PasswordGate>
  )
}

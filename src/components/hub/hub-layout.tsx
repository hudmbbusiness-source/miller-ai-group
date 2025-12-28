'use client'

import Link from 'next/link'
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
  Skull,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

// Dark, minimal background - Kali Linux style
function DarkBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.5) 100%)'
        }}
      />
      {/* Noise */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  )
}

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/launch-pad', label: 'Launch Pad', icon: Rocket },
  { href: '/app/workspace', label: 'Workspace', icon: FileText },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

const toolItems = [
  { href: '/app/tools/playground', label: 'Code Playground', icon: Code2 },
  { href: '/app/tools/kachow', label: 'Kachow AI', icon: Zap },
  { href: '/app/tools/stuntman', label: 'Stuntman AI', icon: BarChart3 },
  { href: '/app/tools/brainbox', label: 'BrainBox', icon: Brain },
]

const adminItems = [
  { href: '/app/admin/verify', label: 'System Verify', icon: Shield },
]

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
          ? "text-gray-600 hover:text-gray-400"
          : "text-green-500 hover:text-green-400"
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

  // Navigation content - Dark, utilitarian
  const NavContent = () => (
    <ScrollArea className="flex-1 py-4">
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono uppercase tracking-wider',
                'transition-all duration-150 relative min-h-[44px]',
                active
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white" />
              )}
              <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "text-white")} />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 mb-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            {'>'} Tools
          </p>
          {toolItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono uppercase tracking-wider',
                  'transition-all duration-150 relative min-h-[44px]',
                  active
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white" />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 mb-2 text-[10px] font-mono text-red-500/60 uppercase tracking-widest">
            {'>'} Admin
          </p>
          {adminItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono uppercase tracking-wider',
                  'transition-all duration-150 relative min-h-[44px]',
                  active
                    ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                    : 'text-gray-500 hover:bg-red-500/5 hover:text-red-400 border border-transparent'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-red-500" />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </ScrollArea>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <DarkBackground />

      <div className="relative flex flex-col min-h-screen z-10">
        {/* Header - Dark, minimal */}
        <header className="h-14 sm:h-16 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-w-[44px] min-h-[44px] text-gray-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/20"
                  onClick={handleNavClick}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#0a0a0a]/98 border-r border-white/10">
                <SheetHeader className="p-6 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-white/5 border border-white/10">
                      <Skull className="w-5 h-5 text-white" />
                    </div>
                    <SheetTitle className="text-lg font-mono font-bold text-left text-white uppercase tracking-wider">
                      MILLER AI
                    </SheetTitle>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <NavContent />
                </div>
                <div className="p-4 border-t border-white/10 flex-shrink-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-500 hover:text-red-500 hover:bg-red-500/5 min-h-[44px] font-mono uppercase tracking-wider text-xs"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Terminate Session
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/app" className="hidden sm:flex items-center gap-3 group" onClick={handleNavClick}>
              <div className="p-1.5 rounded bg-white/5 border border-white/10">
                <Skull className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-mono font-bold text-white uppercase tracking-wider">
                MILLER AI GROUP
              </span>
            </Link>

            <div className="sm:hidden flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <h1 className="font-mono text-xs text-white uppercase tracking-wider">
                {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Status - Minimal */}
            <div className="hidden md:flex items-center gap-4 mr-4 text-[10px] font-mono text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-green-500">ONLINE</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                <span>v2.0</span>
              </div>
            </div>

            <GlobalSearch />
            <KeyboardShortcutsButton />
            <AudioControl />
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-white transition-colors hidden sm:flex"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-white transition-colors hidden sm:flex"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 sm:ml-2 hidden lg:flex min-h-[44px] text-gray-500 hover:text-red-500 hover:bg-red-500/5 font-mono uppercase tracking-wider text-xs"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit
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

        {/* Footer - Minimal */}
        <footer className="h-8 border-t border-white/10 bg-[#0a0a0a]/90 flex items-center justify-between px-4 text-[10px] font-mono text-gray-600">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">{'>'} SYSTEM v2.0</span>
            <span className="hidden sm:inline">ENCRYPTED</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-500">● CONNECTED</span>
            <span className="hidden sm:inline">SESSION: {user.id.slice(0, 8).toUpperCase()}</span>
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

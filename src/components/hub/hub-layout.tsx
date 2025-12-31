'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
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
  Menu,
  Shield,
  Zap,
  BarChart3,
  Brain,
  Rocket,
  Code2,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  Search,
  Bell,
  User,
  Command,
  ImageIcon,
  Stethoscope,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/launch-pad', label: 'Launch Pad', icon: Rocket },
  { href: '/app/workspace', label: 'Workspace', icon: FileText },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

const toolItems = [
  { href: '/app/tools/playground', label: 'Code Playground', icon: Code2 },
  { href: '/app/tools/kachow', label: 'Kachow AI', icon: Zap },
  { href: '/app/tools/stuntman', label: 'StuntMan AI', icon: BarChart3 },
  { href: '/app/tools/brainbox', label: 'BrainBox', icon: Brain },
]

const adminItems = [
  { href: '/app/admin/verify', label: 'System Verify', icon: Shield },
  { href: '/app/admin/media', label: 'Media Library', icon: ImageIcon },
  { href: '/app/admin/diagnostics', label: 'AI Diagnostics', icon: Stethoscope },
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
    <button
      onClick={handleClick}
      className={cn(
        'p-2 rounded-lg transition-colors',
        isMuted
          ? 'text-neutral-500 hover:text-neutral-400 hover:bg-white/5'
          : 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/10'
      )}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  )
}

interface HubLayoutProps {
  children: React.ReactNode
  user: SupabaseUser
}

function HubLayoutContent({ children, user }: HubLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
    setMenuOpen(false)
  }

  const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-neutral-900/95 backdrop-blur-xl border-r border-white/10"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logos/miller-ai-group.svg"
                    alt="Miller AI Group"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                  <span className="font-semibold text-white">Miller AI</span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-neutral-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
                {/* Navigation */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2">Navigation</p>
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                          active
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                {/* Tools */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2">Tools</p>
                  {toolItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                          active
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                {/* Admin */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2">Admin</p>
                  {adminItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                          active
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative flex min-h-screen z-10">
        {/* Desktop Sidebar */}
        <aside className={cn(
          'hidden lg:flex flex-col border-r border-white/5 bg-neutral-900/50 backdrop-blur-xl transition-all duration-300',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}>
          {/* Logo */}
          <div className="p-4 border-b border-white/5">
            <Link href="/app" className="flex items-center gap-3" onClick={handleNavClick}>
              <Image
                src="/logos/miller-ai-group.svg"
                alt="Miller AI Group"
                width={36}
                height={36}
                className="w-9 h-9"
              />
              {!sidebarCollapsed && (
                <span className="font-semibold text-white">Miller AI</span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2">Navigation</p>
              )}
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                      active
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white',
                      sidebarCollapsed && 'justify-center'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                  </Link>
                )
              })}
            </div>

            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2">Tools</p>
              )}
              {toolItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                      active
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white',
                      sidebarCollapsed && 'justify-center'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                  </Link>
                )
              })}
            </div>

            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2">Admin</p>
              )}
              {adminItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                      active
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white',
                      sidebarCollapsed && 'justify-center'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-white/5">
            <button
              onClick={handleLogout}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-red-400 transition-colors w-full',
                sidebarCollapsed && 'justify-center'
              )}
              title={sidebarCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
              <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMenuOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-neutral-400"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Mobile logo */}
                <Link href="/app" className="lg:hidden flex items-center gap-2">
                  <Image
                    src="/logos/miller-ai-group.svg"
                    alt="Miller AI Group"
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                </Link>

                {/* Collapse sidebar button (desktop) */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:flex p-2 rounded-lg hover:bg-white/5 text-neutral-400"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Breadcrumb */}
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">Miller AI</span>
                  <ChevronRight className="w-4 h-4 text-neutral-600" />
                  <span className="text-white font-medium">
                    {pathname === '/app'
                      ? 'Dashboard'
                      : pathname.split('/').pop()?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <GlobalSearch />

                {/* Keyboard shortcuts */}
                <KeyboardShortcutsButton />

                {/* Audio control */}
                <AudioControl />

                {/* User menu */}
                <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white">
                    {userInitial}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-neutral-300">{userName}</span>
                  <button
                    onClick={handleLogout}
                    className="ml-2 p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="p-4 lg:p-6 max-w-7xl mx-auto"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="border-t border-white/5 px-4 lg:px-6 py-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-4">
                <span>Miller AI Group</span>
                <span className="hidden sm:inline text-neutral-700">|</span>
                <span className="hidden sm:inline">v2.0</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Connected</span>
              </div>
            </div>
          </footer>
        </div>
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

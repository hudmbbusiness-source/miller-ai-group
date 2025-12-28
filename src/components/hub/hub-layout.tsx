'use client'

import Link from 'next/link'
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
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useState } from 'react'

// CRT scanline effect
function CRTEffect() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
      }}
    />
  )
}

const navItems = [
  { href: '/app', label: 'dashboard', icon: LayoutDashboard, cmd: 'cd /dashboard' },
  { href: '/app/launch-pad', label: 'launch-pad', icon: Rocket, cmd: 'cd /launch-pad' },
  { href: '/app/workspace', label: 'workspace', icon: FileText, cmd: 'cd /workspace' },
  { href: '/app/settings', label: 'settings', icon: Settings, cmd: 'cd /settings' },
]

const toolItems = [
  { href: '/app/tools/playground', label: 'code-playground', icon: Code2 },
  { href: '/app/tools/kachow', label: 'kachow-ai', icon: Zap },
  { href: '/app/tools/stuntman', label: 'stuntman-ai', icon: BarChart3 },
  { href: '/app/tools/brainbox', label: 'brainbox', icon: Brain },
]

const adminItems = [
  { href: '/app/admin/verify', label: 'sys-verify', icon: Shield },
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
      className={`px-2 py-1 text-xs font-mono ${isMuted ? 'text-green-800' : 'text-green-500'} hover:text-green-400`}
    >
      [{isMuted ? 'MUTED' : 'AUDIO'}]
    </button>
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
  const [menuOpen, setMenuOpen] = useState(false)

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

  const pageTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15 }

  const pageVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }

  const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'user'

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono">
      <CRTEffect />

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/95 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <span className="text-green-500 text-sm">root@miller-ai:~#</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-green-500 hover:text-green-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-1 text-sm">
            <p className="text-green-700 mb-2"># Navigation</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`block py-3 min-h-[44px] ${isActive(item.href) ? 'text-green-400' : 'text-green-600 hover:text-green-400 active:text-green-300'}`}
              >
                $ {item.cmd} {isActive(item.href) && '<--'}
              </Link>
            ))}

            <p className="text-green-700 mt-6 mb-2"># Tools</p>
            {toolItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`block py-3 min-h-[44px] ${isActive(item.href) ? 'text-green-400' : 'text-green-600 hover:text-green-400 active:text-green-300'}`}
              >
                $ ./tools/{item.label} {isActive(item.href) && '<--'}
              </Link>
            ))}

            <p className="text-red-700 mt-6 mb-2"># Admin (root only)</p>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`block py-3 min-h-[44px] ${isActive(item.href) ? 'text-red-400' : 'text-red-600 hover:text-red-400 active:text-red-300'}`}
              >
                # ./admin/{item.label} {isActive(item.href) && '<--'}
              </Link>
            ))}

            <div className="mt-8 pt-4 border-t border-green-900">
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-400 py-3 min-h-[44px] active:text-red-300"
              >
                $ logout --force
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex flex-col min-h-screen z-10">
        {/* Header - Terminal style */}
        <header className="border-b border-green-900 bg-black sticky top-0 z-30">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 text-xs border-b border-green-900/50">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-green-600 hidden sm:inline">root@miller-ai:~</span>
            </div>
            <div className="flex items-center gap-3 text-green-700">
              <span className="hidden md:inline">{new Date().toLocaleTimeString()}</span>
              <span className="text-green-500 flex items-center gap-1">
                <span className="animate-pulse">●</span> LIVE
              </span>
            </div>
          </div>

          {/* Main header */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-4">
              {/* Menu button - min 44px touch target */}
              <button
                onClick={() => setMenuOpen(true)}
                className="text-green-500 hover:text-green-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo/Title */}
              <Link href="/app" className="text-green-500 hover:text-green-400" onClick={handleNavClick}>
                <span className="text-sm font-bold">MILLER_AI</span>
                <span className="text-green-700 text-xs ml-2 hidden sm:inline">v2.0.0</span>
              </Link>

              {/* Current path */}
              <span className="text-green-700 text-xs hidden md:inline">
                pwd: {pathname}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {/* User info */}
              <span className="text-green-600 hidden sm:inline">
                [{userName}@root]
              </span>

              <AudioControl />
              <KeyboardShortcutsButton />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-red-500 hover:text-red-400 hidden sm:block"
              >
                [EXIT]
              </button>
            </div>
          </div>

          {/* Navigation bar */}
          <div className="px-4 py-1 border-t border-green-900/50 overflow-x-auto hidden md:block">
            <div className="flex items-center gap-4 text-xs">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`whitespace-nowrap py-1 ${
                    isActive(item.href)
                      ? 'text-green-400 border-b border-green-400'
                      : 'text-green-700 hover:text-green-500'
                  }`}
                >
                  /{item.label}
                </Link>
              ))}
              <span className="text-green-900">|</span>
              {toolItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`whitespace-nowrap py-1 ${
                    isActive(item.href)
                      ? 'text-green-400 border-b border-green-400'
                      : 'text-green-700 hover:text-green-500'
                  }`}
                >
                  /tools/{item.label}
                </Link>
              ))}
              <span className="text-green-900">|</span>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`whitespace-nowrap py-1 ${
                    isActive(item.href)
                      ? 'text-red-400 border-b border-red-400'
                      : 'text-red-700 hover:text-red-500'
                  }`}
                >
                  /admin/{item.label}
                </Link>
              ))}
            </div>
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
              className="p-4 md:p-6 max-w-7xl mx-auto"
            >
              {/* Page header showing current directory */}
              <div className="mb-4 text-xs text-green-700">
                <span className="text-green-600">root@miller-ai</span>
                <span className="text-green-500">:</span>
                <span className="text-blue-400">{pathname}</span>
                <span className="text-green-500">$ </span>
                <span className="animate-pulse">█</span>
              </div>

              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer - Terminal status bar */}
        <footer className="border-t border-green-900 bg-black px-4 py-1 flex items-center justify-between text-[10px] text-green-700">
          <div className="flex items-center gap-4">
            <span>PID: {Math.floor(Math.random() * 9000 + 1000)}</span>
            <span className="hidden sm:inline">MEM: {Math.floor(Math.random() * 30 + 10)}%</span>
            <span className="hidden sm:inline">CPU: {Math.floor(Math.random() * 20 + 5)}%</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-500">● CONNECTED</span>
            <span className="hidden sm:inline">SESSION: {user.id.slice(0, 8).toUpperCase()}</span>
            <span className="hidden md:inline">TLS 1.3</span>
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

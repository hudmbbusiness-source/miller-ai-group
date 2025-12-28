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
  LayoutDashboard,
  FileText,
  Grid3X3,
  FileCheck,
  Settings,
  LogOut,
  Instagram,
  Linkedin,
  Menu,
  Shield,
  Zap,
  BarChart3,
  Brain,
  Target,
  ShoppingBag,
  Rocket,
  Code2,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

// Animated mesh background for the hub
function HubMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
          top: '-10%',
          left: '-10%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
          bottom: '0%',
          right: '-5%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -30, 0],
          scale: [1, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 60%)',
          top: '40%',
          left: '50%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -20, 20, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

const launchPadItems = [
  { href: '/app/launch-pad', label: 'Launch Pad', icon: Rocket },
  { href: '/app/zuckerberg', label: 'Zuckerberg Project', icon: FileCheck },
]

const workspaceItems = [
  { href: '/app/notes', label: 'Notes', icon: FileText },
  { href: '/app/boards', label: 'Boards', icon: Grid3X3 },
  { href: '/app/assets', label: 'Assets', icon: ShoppingBag },
  { href: '/app/goals', label: 'Goals', icon: Target },
]

const toolItems = [
  { href: '/app/tools/playground', label: 'Code Playground', icon: Code2, color: 'violet' },
  { href: '/app/tools/kachow', label: 'Kachow AI', icon: Zap, color: 'amber' },
  { href: '/app/tools/stuntman', label: 'Stuntman AI', icon: BarChart3, color: 'emerald' },
  { href: '/app/tools/brainbox', label: 'BrainBox', icon: Brain, color: 'blue' },
]

const adminItems = [
  { href: '/app/admin/verify', label: 'System Verify', icon: Shield },
]

interface HubLayoutProps {
  children: React.ReactNode
  user: User
}

export function HubLayout({ children, user }: HubLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()

  useKeyboardShortcuts()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
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
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                  'transition-all duration-200 relative min-h-[44px]',
                  active
                    ? 'bg-gradient-to-r from-violet-500/15 to-purple-500/10 text-violet-400 shadow-lg shadow-violet-500/5'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-500 rounded-r-full"
                  />
                )}
                <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "text-violet-400")} />
                {item.label}
              </Link>
            </motion.div>
          )
        })}

        {/* Launch Pad Section */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <p className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Launch Pad
          </p>
          {launchPadItems.map((item, index) => {
            const active = isActive(item.href)
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navItems.length + index) * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                    'transition-all duration-200 relative min-h-[44px]',
                    active
                      ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-orange-400 shadow-lg shadow-orange-500/5'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-orange-500 to-amber-500 rounded-r-full" />
                  )}
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "text-orange-400")} />
                  {item.label}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Workspace Section (Notes, Boards, Assets, Goals) */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <p className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Workspace
          </p>
          {workspaceItems.map((item, index) => {
            const active = isActive(item.href)
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navItems.length + launchPadItems.length + index) * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                    'transition-all duration-200 relative min-h-[44px]',
                    active
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-400 shadow-lg shadow-cyan-500/5'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-r-full" />
                  )}
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "text-cyan-400")} />
                  {item.label}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Tools Section */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <p className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Tools
          </p>
          {toolItems.map((item, index) => {
            const active = isActive(item.href)
            const colorClasses = {
              amber: 'from-amber-500/15 to-orange-500/10 text-amber-400',
              emerald: 'from-emerald-500/15 to-green-500/10 text-emerald-400',
              violet: 'from-violet-500/15 to-purple-500/10 text-violet-400',
              blue: 'from-blue-500/15 to-cyan-500/10 text-blue-400',
            }
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navItems.length + launchPadItems.length + workspaceItems.length + index) * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                    'transition-all duration-200 relative min-h-[44px]',
                    active
                      ? cn('bg-gradient-to-r shadow-lg', colorClasses[item.color as keyof typeof colorClasses])
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {active && (
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full",
                      item.color === 'amber' && "bg-gradient-to-b from-amber-500 to-orange-500",
                      item.color === 'emerald' && "bg-gradient-to-b from-emerald-500 to-green-500",
                      item.color === 'violet' && "bg-gradient-to-b from-violet-500 to-purple-500",
                      item.color === 'blue' && "bg-gradient-to-b from-blue-500 to-cyan-500"
                    )} />
                  )}
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Admin Section */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <p className="px-3 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Admin
          </p>
          {adminItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                  'transition-all duration-200 relative min-h-[44px]',
                  active
                    ? 'bg-gradient-to-r from-red-500/15 to-rose-500/10 text-red-400 shadow-lg shadow-red-500/5'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-red-500 to-rose-500 rounded-r-full" />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </ScrollArea>
  )

  return (
    <PasswordGate>
    <KeyboardShortcutsProvider>
    <div className="min-h-screen bg-black text-white">
      <HubMesh />

      <div className="relative flex flex-col min-h-screen z-10">
        {/* Header */}
        <header className="h-14 sm:h-16 border-b border-white/5 bg-black/60 backdrop-blur-2xl flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-w-[44px] min-h-[44px] text-neutral-400 hover:text-white hover:bg-white/5"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-neutral-950 border-r border-white/5">
                <SheetHeader className="p-6 border-b border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Image
                        src="/logos/miller-ai-group.png"
                        alt="Miller AI Group"
                        width={32}
                        height={32}
                        className="rounded-lg"
                      />
                    </motion.div>
                    <SheetTitle className="text-lg font-bold text-left text-white">
                      Miller AI Group
                    </SheetTitle>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  {/* eslint-disable-next-line react-hooks/static-components */}
                  <NavContent />
                </div>
                <div className="p-4 border-t border-white/5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-400 hover:text-red-400 hover:bg-red-500/10 min-h-[44px]"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/app" className="hidden sm:flex items-center gap-2 group">
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/logos/miller-ai-group.png"
                  alt="Miller AI Group"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
              </motion.div>
              <span className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
                Miller AI Group
              </span>
            </Link>

            <div className="sm:hidden">
              <h1 className="font-semibold text-sm text-neutral-200">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <GlobalSearch />
            <KeyboardShortcutsButton />
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-white transition-colors hidden sm:flex"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-white transition-colors hidden sm:flex"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 sm:ml-2 hidden lg:flex min-h-[44px] text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
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
      </div>

      <OnboardingDialog />
    </div>
    </KeyboardShortcutsProvider>
    </PasswordGate>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SOCIAL_LINKS } from '@/types'
import { MobileNav } from './mobile-nav'
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
  Link2,
  FolderOpen,
  FileCheck,
  Settings,
  LogOut,
  Instagram,
  Linkedin,
  Menu,
  Shield,
  Zap,
  Video,
  Brain,
  Target,
  ShoppingBag,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/goals', label: 'Goals', icon: Target },
  { href: '/app/assets', label: 'Assets', icon: ShoppingBag },
  { href: '/app/notes', label: 'Notes', icon: FileText },
  { href: '/app/boards', label: 'Boards', icon: Grid3X3 },
  { href: '/app/links', label: 'Links', icon: Link2 },
  { href: '/app/files', label: 'Files', icon: FolderOpen },
  { href: '/app/zuckerberg', label: 'Zuckerberg Project', icon: FileCheck },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

const toolItems = [
  { href: '/app/tools/kachow', label: 'Kachow AI', icon: Zap },
  { href: '/app/tools/stuntman', label: 'Stuntman AI', icon: Video },
  { href: '/app/tools/brainbox', label: 'BrainBox', icon: Brain },
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Enable keyboard shortcuts
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

  // Animation variants that respect reduced motion
  const pageTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2 }

  const pageVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      }

  return (
    <PasswordGate>
    <KeyboardShortcutsProvider>
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Hidden on mobile, use bottom nav instead */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border',
          'transform transition-transform duration-200 ease-in-out',
          'hidden lg:flex flex-col',
          sidebarOpen ? 'translate-x-0 !flex' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link href="/app" className="text-xl font-bold">
              Miller AI Group
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                      'transition-all duration-200 relative min-h-[44px]',
                      active
                        ? 'bg-amber-500/10 text-amber-500 shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {active && !prefersReducedMotion && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full"
                      />
                    )}
                    {active && prefersReducedMotion && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
                    )}
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}

              {/* Tools Section */}
              <div className="pt-4 mt-4 border-t border-border">
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tools
                </p>
                {toolItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                        'transition-all duration-200 relative min-h-[44px]',
                        active
                          ? 'bg-amber-500/10 text-amber-500 shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {active && !prefersReducedMotion && (
                        <motion.div
                          layoutId="activeNavTools"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full"
                        />
                      )}
                      {active && prefersReducedMotion && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
                      )}
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>

              {/* Admin Section */}
              <div className="pt-4 mt-4 border-t border-border">
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
                {adminItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                        'transition-all duration-200 relative min-h-[44px]',
                        active
                          ? 'bg-amber-500/10 text-amber-500 shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {active && !prefersReducedMotion && (
                        <motion.div
                          layoutId="activeNavAdmin"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full"
                        />
                      )}
                      {active && prefersReducedMotion && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
                      )}
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive min-h-[44px]"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 sm:h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden min-w-[44px] min-h-[44px]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-sm sm:text-base">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {user.user_metadata?.user_name ? `@${user.user_metadata.user_name}` : 'Miller AI Group'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <GlobalSearch />
            <KeyboardShortcutsButton />
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 sm:ml-2 hidden sm:flex min-h-[44px]"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Page Content - Add padding bottom for mobile nav */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={pageVariants.initial}
              animate={pageVariants.animate}
              exit={pageVariants.exit}
              transition={pageTransition}
              className="p-3 sm:p-4 lg:p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Onboarding Dialog */}
      <OnboardingDialog />
    </div>
    </KeyboardShortcutsProvider>
    </PasswordGate>
  )
}

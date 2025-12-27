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
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/launch-pad', label: 'Launch Pad', icon: Rocket },
  { href: '/app/goals', label: 'Goals', icon: Target },
  { href: '/app/assets', label: 'Assets', icon: ShoppingBag },
  { href: '/app/notes', label: 'Notes', icon: FileText },
  { href: '/app/boards', label: 'Boards', icon: Grid3X3 },
  { href: '/app/zuckerberg', label: 'Zuckerberg Project', icon: FileCheck },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

const toolItems = [
  { href: '/app/tools/kachow', label: 'Kachow AI', icon: Zap },
  { href: '/app/tools/stuntman', label: 'Stuntman AI', icon: BarChart3 },
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
    : { duration: 0.2 }

  const pageVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      }

  // Navigation content - uses closures for nav items and isActive
  const NavContent = () => (
    <ScrollArea className="flex-1 py-4">
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-all duration-200 relative min-h-[44px]',
                active
                  ? 'bg-amber-500/10 text-amber-500 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
              )}
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

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
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-200 relative min-h-[44px]',
                  active
                    ? 'bg-amber-500/10 text-amber-500 shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>

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
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-200 relative min-h-[44px]',
                  active
                    ? 'bg-amber-500/10 text-amber-500 shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {active && (
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
  )
  return (
    <PasswordGate>
    <KeyboardShortcutsProvider>
    <div className="min-h-screen bg-background">
      <div className="flex flex-col min-h-screen">
        <header className="h-14 sm:h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-w-[44px] min-h-[44px]"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="p-6 border-b border-border flex-shrink-0">
                  <SheetTitle className="text-xl font-bold text-left">
                    Miller AI Group
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  {/* eslint-disable-next-line react-hooks/static-components */}
                  <NavContent />
                </div>
                <div className="p-4 border-t border-border flex-shrink-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-destructive min-h-[44px]"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/app" className="hidden sm:block text-lg font-bold">
              Miller AI Group
            </Link>

            <div className="sm:hidden">
              <h1 className="font-semibold text-sm">
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
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 sm:ml-2 hidden lg:flex min-h-[44px]"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

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
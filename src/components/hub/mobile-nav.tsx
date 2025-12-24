'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Target,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react'

const navItems = [
  { href: '/app', label: 'Home', icon: LayoutDashboard },
  { href: '/app/goals', label: 'Goals', icon: Target },
  { href: '/app/notes', label: 'Notes', icon: FileText },
  { href: '/app/assets', label: 'Assets', icon: ShoppingBag },
  { href: '/app/zuckerberg', label: 'More', icon: MoreHorizontal },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors relative',
                active
                  ? 'text-amber-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="mobileNavActive"
                  className="absolute inset-0 bg-amber-500/10 rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

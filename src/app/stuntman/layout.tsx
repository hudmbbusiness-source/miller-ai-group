// =============================================================================
// STUNTMAN AI - LAYOUT
// =============================================================================
// Modern, clean layout with new logo
// =============================================================================

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'StuntMan AI | Crypto Trading',
  description: 'AI-powered cryptocurrency trading with paper trading and automated strategies',
}

export default async function StuntManLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/stuntman')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo - Clean, professional like Robinhood/Coinbase */}
            <Link href="/stuntman" className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                {/* Abstract S with chart line - minimal design */}
                <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
                  {/* Main S shape */}
                  <path
                    d="M8 10C8 6.68629 10.6863 4 14 4H18C21.3137 4 24 6.68629 24 10V10C24 12.2091 22.2091 14 20 14H12C9.79086 14 8 15.7909 8 18V18C8 21.3137 10.6863 24 14 24H18C21.3137 24 24 21.3137 24 18"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Chart accent line */}
                  <path
                    d="M6 22L12 16L16 19L26 10"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-semibold text-lg tracking-tight hidden sm:block text-white">
                StuntMan
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <NavLink href="/stuntman">Home</NavLink>
              <NavLink href="/stuntman/trade">Trade</NavLink>
              <NavLink href="/stuntman/strategies">Strategies</NavLink>
              <NavLink href="/stuntman/history" className="hidden sm:block">History</NavLink>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Live Indicator - Subtle, professional */}
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-zinc-500 font-medium">Live</span>
              </div>

              {/* Settings */}
              <Link
                href="/stuntman/settings"
                className="p-2 rounded-lg hover:bg-zinc-900 transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>

              {/* Back to Hub */}
              <Link
                href="/app"
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-300 transition-colors hidden sm:block"
              >
                Hub
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}

// =============================================================================
// NAV LINK COMPONENT
// =============================================================================

function NavLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors ${className}`}
    >
      {children}
    </Link>
  )
}

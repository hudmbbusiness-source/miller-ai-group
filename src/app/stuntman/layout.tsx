// @ts-nocheck
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'StuntMan | Apex Trading',
  description: 'Professional futures trading system for Apex Trader Funding',
}

export default async function StuntManLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/stuntman')
  }

  // Clean, minimal layout - no sidebar, just content
  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Redirect to the main StuntMan trading interface
export default function StuntmanToolPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/stuntman')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
        <p className="text-muted-foreground">Loading StuntMan Trading System...</p>
      </div>
    </div>
  )
}

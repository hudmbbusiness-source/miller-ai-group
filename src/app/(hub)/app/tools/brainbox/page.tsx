'use client'

import { AIChatbot } from '@/components/hub/ai-chatbot'
import { Brain } from 'lucide-react'

export default function BrainboxToolPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20">
          <Brain className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">BrainBox</h1>
          <p className="text-muted-foreground">AI-powered assistant for career guidance and learning</p>
        </div>
      </div>

      <AIChatbot />
    </div>
  )
}

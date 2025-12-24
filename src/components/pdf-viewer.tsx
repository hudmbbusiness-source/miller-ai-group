'use client'

import { useState } from 'react'
import { AlertCircle, FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfViewerProps {
  src: string
}

export function PdfViewer({ src }: PdfViewerProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-muted/50 rounded-lg border border-dashed border-border">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Unable to load PDF viewer</p>
        <Button asChild variant="outline">
          <a href={src} target="_blank" rel="noopener noreferrer">
            <FileText className="w-4 h-4 mr-2" />
            Open PDF in New Tab
            <ExternalLink className="w-3 h-3 ml-2" />
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <iframe
        src={src}
        className="w-full h-[600px] rounded-lg border border-border"
        onError={() => setError(true)}
        title="Resume PDF"
      />
      <div className="absolute bottom-4 right-4">
        <Button asChild size="sm" variant="secondary">
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3 mr-2" />
            Open in New Tab
          </a>
        </Button>
      </div>
    </div>
  )
}

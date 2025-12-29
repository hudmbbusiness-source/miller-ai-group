'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Code2,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function PreviewPage() {
  const [html, setHtml] = useState('')
  const [css, setCss] = useState('')
  const [js, setJs] = useState('')
  const [projectName, setProjectName] = useState('Preview')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [showConsole, setShowConsole] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Load code from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('playground_code')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.html) setHtml(data.html)
        if (data.css) setCss(data.css)
        if (data.js) setJs(data.js)
        if (data.projectName) setProjectName(data.projectName)
        setIsLoaded(true)
      } catch {
        setIsLoaded(true)
      }
    } else {
      setIsLoaded(true)
    }
  }, [])

  // Run code when loaded
  useEffect(() => {
    if (isLoaded && (html || css || js)) {
      runCode()
    }
  }, [isLoaded, html, css, js])

  // Listen for console messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.t) {
        const prefix = e.data.t === 'err' ? '× ' : e.data.t === 'warn' ? '⚠ ' : '› '
        setConsoleOutput(p => [...p.slice(-50), prefix + e.data.m])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const runCode = useCallback(() => {
    if (!iframeRef.current) return
    setConsoleOutput([])

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>${css}</style>
</head>
<body>
${html}
<script>
// Console proxy
const _c = console;
window.console = {
  log: (...a) => { parent.postMessage({t:'log', m: a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')}, '*'); _c.log(...a); },
  error: (...a) => { parent.postMessage({t:'err', m: a.map(x => String(x)).join(' ')}, '*'); _c.error(...a); },
  warn: (...a) => { parent.postMessage({t:'warn', m: a.map(x => String(x)).join(' ')}, '*'); _c.warn(...a); }
};
window.onerror = (m, u, l) => parent.postMessage({t:'err', m: m + ' (line ' + l + ')'}, '*');

// Run user code
try {
  ${js}
} catch(e) {
  console.error(e.message);
}
</script>
</body>
</html>`

    iframeRef.current.srcdoc = fullHtml
  }, [html, css, js, projectName])

  const openExternal = () => {
    const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName}</title><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(full)
      win.document.close()
    }
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      isFullscreen && "fixed inset-0 z-50 bg-black"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-4">
          <Link href="/app/tools/playground">
            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Editor
            </Button>
          </Link>
          <div className="w-px h-6 bg-neutral-700" />
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Play className="w-4 h-4 text-green-400" />
            </div>
            <span className="font-semibold text-white">{projectName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsole(!showConsole)}
            className={cn(
              "gap-2",
              showConsole ? "text-violet-400" : "text-neutral-400 hover:text-white"
            )}
          >
            <Code2 className="w-4 h-4" />
            Console
            {consoleOutput.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-400">
                {consoleOutput.length}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={runCode} className="text-neutral-400 hover:text-white gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={openExternal} className="text-neutral-400 hover:text-white gap-2">
            <ExternalLink className="w-4 h-4" />
            New Window
          </Button>
          <div className="w-px h-6 bg-neutral-700" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-neutral-400 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex">
        {/* iframe */}
        <div className={cn("flex-1 bg-white relative", showConsole && "border-r border-neutral-800")}>
          {!isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
              <div className="text-neutral-400">Loading...</div>
            </div>
          ) : !html && !css && !js ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-center p-8">
              <Code2 className="w-12 h-12 text-neutral-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No code to preview</h2>
              <p className="text-neutral-400 mb-4">Go back to the editor and create something!</p>
              <Link href="/app/tools/playground">
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Editor
                </Button>
              </Link>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-modals allow-forms"
              title="Preview"
            />
          )}
        </div>

        {/* Console Panel */}
        {showConsole && (
          <div className="w-96 flex flex-col bg-neutral-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
              <span className="text-sm font-medium text-white">Console</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConsoleOutput([])}
                className="text-neutral-500 hover:text-white h-7 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {consoleOutput.length === 0 ? (
                <span className="text-neutral-600">Console output appears here...</span>
              ) : (
                consoleOutput.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      "py-1 border-b border-neutral-800/50",
                      log.startsWith('×') && "text-red-400",
                      log.startsWith('⚠') && "text-yellow-400",
                      log.startsWith('›') && "text-green-400"
                    )}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

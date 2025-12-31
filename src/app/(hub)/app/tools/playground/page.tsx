'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Code2,
  Save,
  Loader2,
  Sparkles,
  Plus,
  FolderOpen,
  Eye,
  RefreshCw,
  ExternalLink,
  Send,
  X,
  Wand2,
  Copy,
  Check,
  Gamepad2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { GAME_TEMPLATES } from '@/lib/game-templates'

export default function PlaygroundPage() {
  const [html, setHtml] = useState('')
  const [css, setCss] = useState('')
  const [js, setJs] = useState('')
  const [projectName, setProjectName] = useState('Untitled')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])

  // Prompt translator state
  const [rawIdea, setRawIdea] = useState('')
  const [translatedPrompt, setTranslatedPrompt] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [showTranslator, setShowTranslator] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Load a game template
  const loadTemplate = (templateId: string) => {
    const template = GAME_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setHtml(template.html)
      setCss(template.css)
      setJs(template.js)
      setProjectName(template.name)
      setShowTemplates(false)
    }
  }

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const autoRunRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-run preview when code changes
  useEffect(() => {
    if (autoRunRef.current) clearTimeout(autoRunRef.current)
    autoRunRef.current = setTimeout(() => runCode(), 500)
    return () => { if (autoRunRef.current) clearTimeout(autoRunRef.current) }
  }, [html, css, js])

  // Save to localStorage for other pages
  useEffect(() => {
    localStorage.setItem('playground_code', JSON.stringify({ html, css, js, projectName }))
  }, [html, css, js, projectName])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('playground_code')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.html) setHtml(data.html)
        if (data.css) setCss(data.css)
        if (data.js) setJs(data.js)
        if (data.projectName) setProjectName(data.projectName)
        if (data.projectId) setProjectId(data.projectId)
      } catch {}
    }
  }, [])

  // Console message handler
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'console') {
        setConsoleOutput(p => [...p.slice(-20), e.data.message])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Clean code by removing any wrapper tags the AI might include
  const cleanCSS = (code: string) => {
    return code
      .replace(/<style[^>]*>/gi, '')
      .replace(/<\/style>/gi, '')
      .trim()
  }

  const cleanJS = (code: string) => {
    return code
      .replace(/<script[^>]*>/gi, '')
      .replace(/<\/script>/gi, '')
      .trim()
  }

  const cleanHTML = (code: string) => {
    return code
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '')
      .trim()
  }

  const runCode = useCallback(() => {
    if (!iframeRef.current) return
    setConsoleOutput([])

    const safeCSS = cleanCSS(css)
    const safeJS = cleanJS(js)
    const safeHTML = cleanHTML(html)

    const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  min-height: 100vh;
  background: #0a0a0a;
  color: white;
  font-family: system-ui, sans-serif;
}
${safeCSS}
</style>
</head>
<body>
${safeHTML}
<script>
(function() {
  const log = console.log;
  console.log = (...args) => {
    parent.postMessage({ type: 'console', message: '> ' + args.join(' ') }, '*');
    log.apply(console, args);
  };
  console.error = (...args) => {
    parent.postMessage({ type: 'console', message: 'ERROR: ' + args.join(' ') }, '*');
  };
  window.onerror = (msg, url, line) => {
    parent.postMessage({ type: 'console', message: 'ERROR: ' + msg + ' (line ' + line + ')' }, '*');
  };
})();
try {
${safeJS}
} catch(e) { console.error(e.message); }
</script>
</body>
</html>`
    iframeRef.current.srcdoc = doc
  }, [html, css, js])

  // Translate casual idea to technical prompt
  const translatePrompt = async () => {
    if (!rawIdea.trim() || isTranslating) return

    setIsTranslating(true)
    setTranslatedPrompt('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are a prompt engineer. Take this casual/slang description and rewrite it as a detailed, technical prompt for a code generator that creates HTML/CSS/JS.

USER'S IDEA: "${rawIdea}"

Rewrite this as a clear, detailed prompt that specifies:
- Exactly what visual elements to create
- Colors, animations, effects to use
- Interactivity and behavior
- Layout and positioning
- Any special features

Keep it concise but detailed. Only output the rewritten prompt, nothing else.`,
        }),
      })

      const data = await res.json()
      if (data.response) {
        setTranslatedPrompt(data.response)
      }
    } catch (err) {
      console.error(err)
      setTranslatedPrompt('Failed to translate. Try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  const copyTranslatedPrompt = () => {
    navigator.clipboard.writeText(translatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const useTranslatedPrompt = () => {
    setPrompt(translatedPrompt)
    setShowTranslator(false)
    setRawIdea('')
    setTranslatedPrompt('')
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setAiMessage('Generating...')

    try {
      const res = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          action: 'playground',
          currentCode: (html || css || js) ? { html, css, js } : null
        }),
      })

      const data = await res.json()

      if (data.success) {
        if (data.html) setHtml(data.html)
        if (data.css) setCss(data.css)
        if (data.js) setJs(data.js)
        setAiMessage(data.description || 'Done!')
        setPrompt('')
      } else if (data.raw) {
        setAiMessage('AI response format issue. Check console.')
        console.log('Raw AI response:', data.raw)
      } else {
        setAiMessage(data.error || 'Generation failed')
      }
    } catch (err) {
      console.error(err)
      setAiMessage('Error generating code')
    } finally {
      setIsGenerating(false)
      setTimeout(() => setAiMessage(''), 5000)
    }
  }

  const saveProject = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Sign in to save')
        setIsSaving(false)
        return
      }

      const projectData = {
        user_id: user.id,
        name: projectName,
        html,
        css,
        js,
        updated_at: new Date().toISOString()
      }

      if (projectId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('playground_projects') as any).update(projectData).eq('id', projectId)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('playground_projects') as any)
          .insert({ ...projectData, created_at: new Date().toISOString() })
          .select()
          .single()
        if (data) setProjectId(data.id)
      }
      setAiMessage('Saved!')
      setTimeout(() => setAiMessage(''), 2000)
    } catch (err) {
      console.error(err)
      setAiMessage('Save failed')
    }
    setIsSaving(false)
  }

  const newProject = () => {
    setProjectId(null)
    setProjectName('Untitled')
    setHtml('')
    setCss('')
    setJs('')
    setConsoleOutput([])
    localStorage.removeItem('playground_code')
  }

  const openInNewWindow = () => {
    const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { min-height: 100vh; background: #0a0a0a; color: white; font-family: system-ui, sans-serif; } ${css}</style></head><body>${html}<script>${js}<\/script></body></html>`
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(doc)
      win.document.close()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-white">Playground</span>
          </div>
          <div className="w-px h-5 bg-[#3c3c3c]" />
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-neutral-300 text-sm border-none outline-none w-32"
            placeholder="Project name"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={newProject} className="text-neutral-400 hover:text-white h-8">
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-emerald-400 hover:text-emerald-300 h-8"
            >
              <Gamepad2 className="w-4 h-4 mr-1" /> Templates <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
            {showTemplates && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl z-50">
                <div className="p-2 border-b border-[#3c3c3c]">
                  <span className="text-xs text-neutral-500">Ready-to-play games</span>
                </div>
                {GAME_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => loadTemplate(template.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#3c3c3c] transition-colors text-left"
                  >
                    <span className="text-2xl">{template.thumbnail}</span>
                    <div>
                      <div className="text-sm text-white font-medium">{template.name}</div>
                      <div className="text-xs text-neutral-500">{template.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={saveProject} disabled={isSaving} className="text-violet-400 hover:text-violet-300 h-8">
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
          <div className="w-px h-5 bg-[#3c3c3c]" />
          <Link href="/app/tools/playground/preview">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          </Link>
          <Link href="/app/tools/playground/saved">
            <Button size="sm" variant="outline" className="border-[#3c3c3c] text-neutral-300 hover:bg-[#3c3c3c] h-8">
              <FolderOpen className="w-4 h-4 mr-1" /> Saved
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editors - Left Side */}
        <div className="w-1/2 flex flex-col border-r border-[#3c3c3c]">
          {/* HTML Editor */}
          <div className="flex-1 flex flex-col border-b border-[#3c3c3c]">
            <div className="h-8 flex items-center px-3 bg-[#2d2d2d] border-b border-[#3c3c3c]">
              <span className="text-xs font-medium text-orange-400">HTML</span>
            </div>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="flex-1 bg-[#1e1e1e] text-orange-200 font-mono text-sm p-3 resize-none outline-none"
              placeholder="<div>Your HTML here...</div>"
              spellCheck={false}
            />
          </div>

          {/* CSS Editor */}
          <div className="flex-1 flex flex-col border-b border-[#3c3c3c]">
            <div className="h-8 flex items-center px-3 bg-[#2d2d2d] border-b border-[#3c3c3c]">
              <span className="text-xs font-medium text-blue-400">CSS</span>
            </div>
            <textarea
              value={css}
              onChange={(e) => setCss(e.target.value)}
              className="flex-1 bg-[#1e1e1e] text-blue-200 font-mono text-sm p-3 resize-none outline-none"
              placeholder=".container { ... }"
              spellCheck={false}
            />
          </div>

          {/* JS Editor */}
          <div className="flex-1 flex flex-col">
            <div className="h-8 flex items-center px-3 bg-[#2d2d2d] border-b border-[#3c3c3c]">
              <span className="text-xs font-medium text-yellow-400">JavaScript</span>
            </div>
            <textarea
              value={js}
              onChange={(e) => setJs(e.target.value)}
              className="flex-1 bg-[#1e1e1e] text-yellow-200 font-mono text-sm p-3 resize-none outline-none"
              placeholder="// Your JavaScript here..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview - Right Side */}
        <div className="w-1/2 flex flex-col">
          {/* Preview Header */}
          <div className="h-8 flex items-center justify-between px-3 bg-[#2d2d2d] border-b border-[#3c3c3c]">
            <span className="text-xs font-medium text-green-400">Preview</span>
            <div className="flex items-center gap-1">
              <button onClick={runCode} className="p-1 hover:bg-[#3c3c3c] rounded" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
              </button>
              <button onClick={openInNewWindow} className="p-1 hover:bg-[#3c3c3c] rounded" title="Open in new window">
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Preview iframe */}
          <div className="flex-1 bg-[#0a0a0a]">
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-modals"
              title="Preview"
            />
          </div>

          {/* Console */}
          <div className="h-24 flex flex-col border-t border-[#3c3c3c]">
            <div className="h-6 flex items-center justify-between px-3 bg-[#2d2d2d] border-b border-[#3c3c3c]">
              <span className="text-xs text-neutral-500">Console</span>
              <button onClick={() => setConsoleOutput([])} className="text-neutral-600 hover:text-neutral-400">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-[#1e1e1e]">
              {consoleOutput.length === 0 ? (
                <span className="text-neutral-600">Console output...</span>
              ) : consoleOutput.map((msg, i) => (
                <div key={i} className={cn(
                  "py-0.5",
                  msg.startsWith('ERROR') ? "text-red-400" : "text-green-400"
                )}>{msg}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Translator Panel */}
      {showTranslator && (
        <div className="border-t border-[#3c3c3c] bg-[#1e1e1e] p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Prompt Translator</span>
                <span className="text-xs text-neutral-500">Write your idea casually, get a detailed prompt</span>
              </div>
              <button onClick={() => setShowTranslator(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Input */}
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Your idea (casual)</label>
                <textarea
                  value={rawIdea}
                  onChange={(e) => setRawIdea(e.target.value)}
                  placeholder="e.g., make me a cool bouncing ball thing with like sparkles and stuff when it bounces"
                  className="w-full h-24 bg-[#2d2d2d] text-white text-sm p-3 rounded-lg resize-none outline-none border border-[#3c3c3c] focus:border-amber-500"
                />
                <Button
                  onClick={translatePrompt}
                  disabled={isTranslating || !rawIdea.trim()}
                  className="mt-2 bg-amber-600 hover:bg-amber-700"
                >
                  {isTranslating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  Translate
                </Button>
              </div>

              {/* Output */}
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Technical prompt (copy this)</label>
                <textarea
                  value={translatedPrompt}
                  readOnly
                  placeholder="Translated prompt will appear here..."
                  className="w-full h-24 bg-[#2d2d2d] text-green-300 text-sm p-3 rounded-lg resize-none outline-none border border-[#3c3c3c]"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={copyTranslatedPrompt}
                    disabled={!translatedPrompt}
                    variant="outline"
                    className="border-[#3c3c3c] text-neutral-300"
                  >
                    {copied ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    onClick={useTranslatedPrompt}
                    disabled={!translatedPrompt}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Use This Prompt
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Input Bar - Bottom */}
      <div className="h-14 flex items-center gap-3 px-4 bg-[#252526] border-t border-[#3c3c3c]">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowTranslator(!showTranslator)}
          className={cn(
            "h-8 px-2",
            showTranslator ? "text-amber-400" : "text-neutral-500 hover:text-amber-400"
          )}
          title="Prompt Translator"
        >
          <Wand2 className="w-4 h-4" />
        </Button>
        <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0" />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="Describe what to create... (e.g., 'bouncing ball with particle effects', 'neon button', 'space shooter game')"
          className="flex-1 bg-[#3c3c3c] text-white text-sm px-4 py-2 rounded-lg outline-none placeholder:text-neutral-500 focus:ring-1 focus:ring-violet-500"
          disabled={isGenerating}
        />
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="bg-violet-600 hover:bg-violet-700 h-9 px-4"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
        {aiMessage && (
          <span className={cn(
            "text-sm",
            aiMessage.includes('Error') || aiMessage.includes('failed') ? "text-red-400" : "text-green-400"
          )}>{aiMessage}</span>
        )}
      </div>
    </div>
  )
}

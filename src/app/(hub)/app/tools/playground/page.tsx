'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Code2,
  Copy,
  Check,
  Play,
  Save,
  Trash2,
  Download,
  Loader2,
  Sparkles,
  RefreshCw,
  Zap,
  FileCode,
  FileText,
  Palette,
  X,
  Plus,
  Maximize2,
  Minimize2,
  ExternalLink,
  Send,
  Bot,
  User,
  FolderOpen,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SavedProject {
  id: string
  name: string
  html: string
  css: string
  js: string
  created_at: string
  updated_at: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type EditorTab = 'html' | 'css' | 'js'
type RightTab = 'preview' | 'saved'

const DEFAULT_HTML = `<div class="container">
  <h1 class="title">Welcome</h1>
  <p class="subtitle">Click the button to start</p>
  <button class="btn" id="startBtn">Get Started</button>
  <div id="content"></div>
</div>`

const DEFAULT_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  overflow: hidden;
}

.container {
  text-align: center;
  padding: 3rem;
}

.title {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

.subtitle {
  color: rgba(255,255,255,0.6);
  margin-bottom: 2rem;
}

.btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

#content {
  margin-top: 2rem;
}`

const DEFAULT_JS = `const btn = document.getElementById('startBtn');
const content = document.getElementById('content');
let count = 0;

btn?.addEventListener('click', () => {
  count++;
  content.innerHTML = \`
    <div style="padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 16px;">
      <p style="font-size: 1.5rem;">Clicked \${count} time\${count > 1 ? 's' : ''}!</p>
    </div>
  \`;
});

console.log('Ready!');`

export default function PlaygroundPage() {
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss] = useState(DEFAULT_CSS)
  const [js, setJs] = useState(DEFAULT_JS)
  const [editorTab, setEditorTab] = useState<EditorTab>('html')
  const [rightTab, setRightTab] = useState<RightTab>('preview')
  const [projectName, setProjectName] = useState('Untitled Project')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "I'm your code assistant. Tell me what to build and I'll create the HTML, CSS, and JS for you. Try: \"Create a bouncing ball animation\" or \"Build a neon button with hover effects\""
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [autoRun, setAutoRun] = useState(true)
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const runTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (autoRun) {
      if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current)
      runTimeoutRef.current = setTimeout(() => runCode(), 300)
    }
    return () => { if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current) }
  }, [html, css, js, autoRun])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const loadProjects = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('playground_projects') as any)
        .select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
      if (data) setSavedProjects(data)
    } catch (err) { console.error('Load failed:', err) }
  }

  const saveProject = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('Sign in to save'); return }

      const projectData = { user_id: user.id, name: projectName, html, css, js, updated_at: new Date().toISOString() }

      if (projectId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('playground_projects') as any).update(projectData).eq('id', projectId)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('playground_projects') as any)
          .insert({ ...projectData, created_at: new Date().toISOString() }).select().single()
        if (data) setProjectId(data.id)
      }
      await loadProjects()
    } catch (err) { console.error('Save failed:', err) }
    finally { setIsSaving(false) }
  }

  const loadProject = (project: SavedProject) => {
    setProjectId(project.id)
    setProjectName(project.name)
    setHtml(project.html)
    setCss(project.css)
    setJs(project.js)
    setRightTab('preview')
    setChatMessages([{ role: 'assistant', content: `Loaded "${project.name}". What changes would you like?` }])
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('playground_projects') as any).delete().eq('id', id)
      if (projectId === id) newProject()
      await loadProjects()
    } catch (err) { console.error('Delete failed:', err) }
  }

  const newProject = () => {
    setProjectId(null)
    setProjectName('Untitled Project')
    setHtml(DEFAULT_HTML)
    setCss(DEFAULT_CSS)
    setJs(DEFAULT_JS)
    setConsoleOutput([])
    setChatMessages([{ role: 'assistant', content: "New project started! What would you like to build?" }])
  }

  const runCode = useCallback(() => {
    if (!iframeRef.current) return
    setConsoleOutput([])
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}<script>
const _c=console;window.console={log:(...a)=>{parent.postMessage({t:'log',m:a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')},'*');_c.log(...a)},error:(...a)=>{parent.postMessage({t:'err',m:a.map(x=>String(x)).join(' ')},'*');_c.error(...a)},warn:(...a)=>{parent.postMessage({t:'warn',m:a.map(x=>String(x)).join(' ')},'*');_c.warn(...a)}};
window.onerror=(m,u,l)=>parent.postMessage({t:'err',m:m+' (line '+l+')'},'*');
try{${js}}catch(e){console.error(e.message)}</script></body></html>`
    iframeRef.current.srcdoc = fullHtml
  }, [html, css, js])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.t) {
        const prefix = e.data.t === 'err' ? '× ' : e.data.t === 'warn' ? '! ' : '› '
        setConsoleOutput(p => [...p.slice(-30), prefix + e.data.m])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleChat = async () => {
    if (!chatInput.trim() || isGenerating) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(p => [...p, { role: 'user', content: userMsg }])
    setIsGenerating(true)

    try {
      const systemPrompt = `You are an expert web developer. The user wants you to create or modify HTML/CSS/JS code.

CURRENT CODE:
HTML:
${html}

CSS:
${css}

JS:
${js}

RESPOND WITH THIS EXACT FORMAT:
[Your brief explanation - 1-2 sentences max]

===HTML===
[complete HTML code here]
===CSS===
[complete CSS code here]
===JS===
[complete JavaScript code here]

REQUIREMENTS:
- Always include all 3 sections (===HTML===, ===CSS===, ===JS===)
- Make visually impressive code with animations, gradients, modern effects
- For games: use canvas, smooth animations, particle effects
- For UI: glassmorphism, gradients, hover effects, transitions
- Code must be complete and working - no placeholders
- Keep explanations very brief`

      const res = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          systemPrompt,
          conversationHistory: chatMessages.slice(-4),
          action: 'chat',
        }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const response = data.code || data.response || ''

      // Parse response with === markers
      const htmlMatch = response.match(/===HTML===([\s\S]*?)(?====CSS===|===JS===|$)/i)
      const cssMatch = response.match(/===CSS===([\s\S]*?)(?====HTML===|===JS===|$)/i)
      const jsMatch = response.match(/===JS===([\s\S]*?)(?====HTML===|===CSS===|$)/i)

      // Get explanation (text before first ===)
      const explMatch = response.match(/^([\s\S]*?)(?====)/i)
      const explanation = explMatch ? explMatch[1].trim() : ''

      if (htmlMatch || cssMatch || jsMatch) {
        if (htmlMatch) setHtml(htmlMatch[1].trim())
        if (cssMatch) setCss(cssMatch[1].trim())
        if (jsMatch) setJs(jsMatch[1].trim())
        setChatMessages(p => [...p, { role: 'assistant', content: explanation || "Done! Check the Preview tab." }])
        setRightTab('preview')
      } else {
        setChatMessages(p => [...p, { role: 'assistant', content: response || "Could you be more specific?" }])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setChatMessages(p => [...p, { role: 'assistant', content: "Error generating code. Please try again." }])
    } finally {
      setIsGenerating(false)
    }
  }

  const getCurrentCode = () => editorTab === 'html' ? html : editorTab === 'css' ? css : js
  const setCurrentCode = (code: string) => {
    if (editorTab === 'html') setHtml(code)
    else if (editorTab === 'css') setCss(code)
    else setJs(code)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getCurrentCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName}</title><style>${css}</style></head><body>${html}<script>${js}</script></body></html>`
    const blob = new Blob([full], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
  }

  const openExternal = () => {
    const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName}</title><style>${css}</style></head><body>${html}<script>${js}</script></body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(full); win.document.close() }
  }

  return (
    <div className={cn(
      "flex flex-col rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900",
      isFullscreen ? "fixed inset-4 z-50" : "h-[calc(100vh-160px)] min-h-[600px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-white p-0 h-auto w-40 focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={newProject} className="text-neutral-400 hover:text-white h-7 px-2">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={saveProject} disabled={isSaving} className="text-violet-400 hover:text-violet-300 h-7 px-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="text-neutral-400 hover:text-white h-7 px-2">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="text-neutral-400 hover:text-white h-7 px-2">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat + Editor */}
        <div className="w-1/2 flex flex-col border-r border-neutral-800">
          {/* Chat Section */}
          <div className="h-48 flex flex-col border-b border-neutral-800 bg-neutral-950">
            <div className="px-3 py-1.5 border-b border-neutral-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-medium text-neutral-300">AI Assistant</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "")}>
                  {msg.role === 'assistant' && (
                    <Bot className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs",
                    msg.role === 'user' ? "bg-violet-600 text-white" : "bg-neutral-800 text-neutral-200"
                  )}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <User className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-2">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  <span className="text-xs text-neutral-400">Generating...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2 border-t border-neutral-800">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe what to build..."
                  className="flex-1 bg-neutral-900 border-neutral-700 text-xs h-7"
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                  disabled={isGenerating}
                />
                <Button size="sm" onClick={handleChat} disabled={isGenerating || !chatInput.trim()} className="bg-violet-600 hover:bg-violet-700 h-7 px-2">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Editor Section */}
          <div className="flex-1 flex flex-col">
            {/* Editor Tabs */}
            <div className="flex items-center gap-1 px-2 py-1 border-b border-neutral-800 bg-neutral-950">
              {[
                { id: 'html' as EditorTab, label: 'HTML', icon: FileCode, color: '#f97316' },
                { id: 'css' as EditorTab, label: 'CSS', icon: Palette, color: '#3b82f6' },
                { id: 'js' as EditorTab, label: 'JS', icon: FileText, color: '#eab308' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setEditorTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all",
                    editorTab === tab.id ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                  )}
                  style={editorTab === tab.id ? { backgroundColor: `${tab.color}22`, color: tab.color } : {}}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="text-neutral-500 hover:text-white h-6 px-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1 relative">
              <textarea
                value={getCurrentCode()}
                onChange={(e) => setCurrentCode(e.target.value)}
                className={cn(
                  "absolute inset-0 bg-neutral-950 border-0 font-mono text-xs resize-none p-3 focus:outline-none leading-relaxed",
                  editorTab === 'html' && "text-orange-300",
                  editorTab === 'css' && "text-blue-300",
                  editorTab === 'js' && "text-yellow-300"
                )}
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Right: Preview / Saved Tabs */}
        <div className="w-1/2 flex flex-col">
          {/* Right Tabs */}
          <div className="flex items-center gap-1 px-2 py-1 border-b border-neutral-800 bg-neutral-950">
            <button
              onClick={() => setRightTab('preview')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all",
                rightTab === 'preview' ? "bg-green-500/20 text-green-400" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => { setRightTab('saved'); loadProjects() }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all",
                rightTab === 'saved' ? "bg-violet-500/20 text-violet-400" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Saved
            </button>
            {rightTab === 'preview' && (
              <div className="ml-auto flex items-center gap-1">
                <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer mr-2">
                  <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} className="w-3 h-3" />
                  Auto
                </label>
                {!autoRun && (
                  <Button size="sm" onClick={runCode} className="bg-green-600 hover:bg-green-700 h-6 px-2 text-xs">
                    <Play className="w-3 h-3 mr-1" />Run
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={runCode} className="text-neutral-500 hover:text-white h-6 px-1">
                  <RefreshCw className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={openExternal} className="text-neutral-500 hover:text-white h-6 px-1">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          {rightTab === 'preview' ? (
            <div className="flex-1 flex flex-col">
              {/* Preview iframe */}
              <div className="flex-1 bg-white">
                <iframe ref={iframeRef} className="w-full h-full border-0" sandbox="allow-scripts allow-modals allow-forms" title="Preview" />
              </div>
              {/* Console */}
              <div className="h-20 border-t border-neutral-800 bg-neutral-950 flex flex-col">
                <div className="flex items-center justify-between px-2 py-0.5 border-b border-neutral-800">
                  <span className="text-xs text-neutral-500">Console</span>
                  <Button variant="ghost" size="sm" onClick={() => setConsoleOutput([])} className="text-neutral-600 hover:text-white h-4 px-1">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
                  {consoleOutput.length === 0 ? (
                    <span className="text-neutral-600">Console output appears here...</span>
                  ) : consoleOutput.map((log, i) => (
                    <div key={i} className={cn("py-0.5", log.startsWith('×') ? "text-red-400" : log.startsWith('!') ? "text-yellow-400" : "text-green-400")}>{log}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 bg-neutral-950">
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Saved Projects</h3>
              {savedProjects.length === 0 ? (
                <p className="text-neutral-600 text-sm">No saved projects yet. Create something and click Save!</p>
              ) : (
                <div className="space-y-2">
                  {savedProjects.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer group transition-all border",
                        projectId === p.id
                          ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                          : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                      )}
                      onClick={() => loadProject(p)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {new Date(p.updated_at).toLocaleDateString()} · {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

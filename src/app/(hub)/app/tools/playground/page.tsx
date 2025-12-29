'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Code2,
  Copy,
  Check,
  Play,
  Save,
  Download,
  Loader2,
  Sparkles,
  Plus,
  Maximize2,
  Minimize2,
  Send,
  Bot,
  User,
  FolderOpen,
  Eye,
  FileCode,
  FileText,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type EditorTab = 'html' | 'css' | 'js'

const DEFAULT_HTML = `<div class="container">
  <h1 class="title">Welcome</h1>
  <p class="subtitle">Start building something amazing</p>
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
    <div style="padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 16px; margin-top: 1rem;">
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
  const [projectName, setProjectName] = useState('Untitled Project')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hey! I'm your code assistant. Tell me what you want to build - games, animations, UI components, whatever. I'll create the code for you."
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Save current code to localStorage for preview page
  useEffect(() => {
    localStorage.setItem('playground_code', JSON.stringify({ html, css, js, projectName }))
  }, [html, css, js, projectName])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Load from localStorage on mount (for returning from preview/saved)
  useEffect(() => {
    const saved = localStorage.getItem('playground_code')
    if (saved) {
      try {
        const { html: h, css: c, js: j, projectName: n } = JSON.parse(saved)
        if (h) setHtml(h)
        if (c) setCss(c)
        if (j) setJs(j)
        if (n) setProjectName(n)
      } catch {}
    }
  }, [])

  const saveProject = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('Sign in to save projects'); setIsSaving(false); return }

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
      setChatMessages(p => [...p, { role: 'assistant', content: `Saved "${projectName}"! You can find it in the Saved tab.` }])
    } catch (err) {
      console.error('Save failed:', err)
      setChatMessages(p => [...p, { role: 'assistant', content: 'Failed to save. Please try again.' }])
    }
    finally { setIsSaving(false) }
  }

  const newProject = () => {
    setProjectId(null)
    setProjectName('Untitled Project')
    setHtml(DEFAULT_HTML)
    setCss(DEFAULT_CSS)
    setJs(DEFAULT_JS)
    setChatMessages([{ role: 'assistant', content: "New project started! What would you like to build?" }])
  }

  const handleChat = async () => {
    if (!chatInput.trim() || isGenerating) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(p => [...p, { role: 'user', content: userMsg }])
    setIsGenerating(true)

    try {
      const systemPrompt = `You are an expert web developer. Create HTML, CSS, and JavaScript code based on user requests.

CURRENT CODE STATE:
HTML:
${html}

CSS:
${css}

JS:
${js}

ALWAYS RESPOND IN THIS EXACT FORMAT:
[Brief 1-2 sentence description of what you created/changed]

===HTML===
[Your complete HTML code - just the body content, no doctype/html/head tags]
===CSS===
[Your complete CSS code]
===JS===
[Your complete JavaScript code]

IMPORTANT RULES:
1. ALWAYS include all three sections: ===HTML===, ===CSS===, ===JS===
2. Create visually impressive, modern code with:
   - Smooth animations and transitions
   - Gradients and modern color schemes
   - Glassmorphism, shadows, hover effects
   - For games: use canvas, particle effects, smooth physics
3. Code must be COMPLETE and WORKING - no placeholders or TODOs
4. Keep explanation brief - focus on the code
5. If user asks to modify existing code, preserve what works and change only what's needed`

      const res = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          systemPrompt,
          conversationHistory: chatMessages.slice(-6),
          action: 'chat',
        }),
      })

      if (!res.ok) throw new Error('Failed to generate')
      const data = await res.json()
      const response = data.code || data.response || ''

      // Parse response
      const htmlMatch = response.match(/===HTML===([\s\S]*?)(?====CSS===|===JS===|$)/i)
      const cssMatch = response.match(/===CSS===([\s\S]*?)(?====HTML===|===JS===|$)/i)
      const jsMatch = response.match(/===JS===([\s\S]*?)(?====HTML===|===CSS===|$)/i)
      const explMatch = response.match(/^([\s\S]*?)(?====)/i)
      const explanation = explMatch ? explMatch[1].trim() : ''

      if (htmlMatch || cssMatch || jsMatch) {
        if (htmlMatch) setHtml(htmlMatch[1].trim())
        if (cssMatch) setCss(cssMatch[1].trim())
        if (jsMatch) setJs(jsMatch[1].trim())
        setChatMessages(p => [...p, { role: 'assistant', content: explanation || "Done! Click Preview to see it in action." }])
      } else {
        setChatMessages(p => [...p, { role: 'assistant', content: response || "I need more details. What would you like me to create?" }])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setChatMessages(p => [...p, { role: 'assistant', content: "Something went wrong. Please try again." }])
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
    const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName}</title><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`
    const blob = new Blob([full], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Code Playground</h1>
              <p className="text-neutral-400 text-sm">Build, test, and save your creations</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/app/tools/playground/preview">
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </Link>
            <Link href="/app/tools/playground/saved">
              <Button variant="outline" className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10 gap-2 px-6">
                <FolderOpen className="w-4 h-4" />
                Saved
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "max-w-7xl mx-auto rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/50 backdrop-blur",
        isFullscreen && "fixed inset-4 z-50 max-w-none"
      )}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900">
          <div className="flex items-center gap-4">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-neutral-800 border-neutral-700 text-white font-medium w-56 focus-visible:ring-violet-500"
              placeholder="Project name..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={newProject} className="text-neutral-400 hover:text-white gap-2">
              <Plus className="w-4 h-4" />
              New
            </Button>
            <Button variant="ghost" size="sm" onClick={saveProject} disabled={isSaving} className="text-violet-400 hover:text-violet-300 gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} className="text-neutral-400 hover:text-white gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <div className="w-px h-6 bg-neutral-700 mx-2" />
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="text-neutral-400 hover:text-white">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex" style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '70vh' }}>
          {/* AI Chat Panel */}
          <div className="w-80 flex flex-col border-r border-neutral-800 bg-neutral-950/50">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span className="font-semibold text-white">AI Assistant</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "")}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-violet-400" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === 'user'
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-neutral-800 text-neutral-200 rounded-bl-md"
                  )}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-neutral-300" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isGenerating && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  </div>
                  <div className="bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <span className="text-sm text-neutral-400">Creating your code...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-neutral-800">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="What should I build?"
                  className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:ring-violet-500"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                  disabled={isGenerating}
                />
                <Button
                  onClick={handleChat}
                  disabled={isGenerating || !chatInput.trim()}
                  className="bg-violet-600 hover:bg-violet-700 px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 flex flex-col">
            {/* Editor Tabs */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800 bg-neutral-900/50">
              {[
                { id: 'html' as EditorTab, label: 'HTML', icon: FileCode, color: '#f97316' },
                { id: 'css' as EditorTab, label: 'CSS', icon: Palette, color: '#3b82f6' },
                { id: 'js' as EditorTab, label: 'JavaScript', icon: FileText, color: '#eab308' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setEditorTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    editorTab === tab.id
                      ? "text-white shadow-lg"
                      : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
                  )}
                  style={editorTab === tab.id ? { backgroundColor: `${tab.color}22`, color: tab.color } : {}}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="text-neutral-500 hover:text-white gap-2">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Code Area */}
            <div className="flex-1 relative bg-neutral-950">
              <textarea
                value={getCurrentCode()}
                onChange={(e) => setCurrentCode(e.target.value)}
                className={cn(
                  "absolute inset-0 w-full h-full bg-transparent border-0 font-mono text-sm resize-none p-6 focus:outline-none leading-relaxed",
                  editorTab === 'html' && "text-orange-300",
                  editorTab === 'css' && "text-blue-300",
                  editorTab === 'js' && "text-yellow-300"
                )}
                spellCheck={false}
                placeholder={`Write your ${editorTab.toUpperCase()} code here...`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

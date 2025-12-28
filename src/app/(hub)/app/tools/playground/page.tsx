'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Code2,
  Copy,
  Check,
  Play,
  Wand2,
  Bug,
  MessageSquare,
  Trash2,
  Download,
  Loader2,
  Sparkles,
  Terminal,
  RefreshCw,
  ArrowRightLeft,
  Zap,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Language = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'react' | 'sql'
type Action = 'generate' | 'improve' | 'debug' | 'explain' | 'convert'

const LANGUAGES: { id: Language; label: string; icon: string }[] = [
  { id: 'javascript', label: 'JavaScript', icon: 'JS' },
  { id: 'typescript', label: 'TypeScript', icon: 'TS' },
  { id: 'python', label: 'Python', icon: 'PY' },
  { id: 'react', label: 'React/JSX', icon: 'RX' },
  { id: 'html', label: 'HTML', icon: '<>' },
  { id: 'css', label: 'CSS', icon: '#' },
  { id: 'sql', label: 'SQL', icon: 'DB' },
]

const ACTIONS: { id: Action; label: string; icon: typeof Wand2; description: string; color: string }[] = [
  { id: 'generate', label: 'Generate', icon: Sparkles, description: 'Create new code from scratch', color: 'fuchsia' },
  { id: 'improve', label: 'Improve', icon: Wand2, description: 'Optimize and enhance code', color: 'green' },
  { id: 'debug', label: 'Debug', icon: Bug, description: 'Find and fix bugs', color: 'amber' },
  { id: 'explain', label: 'Explain', icon: MessageSquare, description: 'Get code explanation', color: 'cyan' },
  { id: 'convert', label: 'Convert', icon: ArrowRightLeft, description: 'Convert to another language', color: 'purple' },
]

const SAMPLE_PROMPTS = [
  'Create a function that generates a random password with specified length',
  'Build a React hook for managing local storage state',
  'Write a Python script to scrape data from a website',
  'Create a responsive CSS grid layout with animations',
  'Write a SQL query to find duplicate records',
]

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState('')
  const [code, setCode] = useState('')
  const [output, setOutput] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('javascript')
  const [action, setAction] = useState<Action>('generate')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && !code.trim()) {
      setError('Please enter a prompt or some code to work with')
      return
    }

    setIsLoading(true)
    setError(null)
    setOutput(null)

    try {
      const response = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          existingCode: code.trim(),
          language,
          action,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate code')
      }

      const data = await response.json()

      if (action === 'explain') {
        setOutput(data.code)
      } else {
        setCode(data.code)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [prompt, code, language, action])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const extensions: Record<Language, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      react: 'jsx',
      html: 'html',
      css: 'css',
      sql: 'sql',
    }
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${extensions[language]}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setCode('')
    setPrompt('')
    setOutput(null)
    setError(null)
  }

  const handleRunCode = () => {
    if (!code.trim()) return

    try {
      if (language === 'javascript') {
        // Create a safe execution environment
        const logs: string[] = []
        const mockConsole = {
          log: (...args: unknown[]) => logs.push(args.map(a => JSON.stringify(a)).join(' ')),
          error: (...args: unknown[]) => logs.push(`ERROR: ${args.map(a => JSON.stringify(a)).join(' ')}`),
          warn: (...args: unknown[]) => logs.push(`WARN: ${args.map(a => JSON.stringify(a)).join(' ')}`),
        }

        // Execute with mock console
        const fn = new Function('console', code)
        fn(mockConsole)
        setOutput(logs.join('\n') || 'Code executed successfully (no output)')
      } else {
        setOutput(`Running ${language} code requires a server-side execution environment.`)
      }
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.div
          className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/25"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Code2 className="w-8 h-8 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-fuchsia-400">
            CODE PLAYGROUND
          </h1>
          <p className="text-neutral-400 font-mono text-sm">
            AI-Powered Code Sandbox • Powered by Groq
          </p>
        </div>
        <Badge className="ml-auto bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 font-mono">
          <Zap className="w-3 h-3 mr-1" />
          DEDSEC
        </Badge>
      </div>

      {/* Language Selector */}
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((lang) => (
          <Button
            key={lang.id}
            variant={language === lang.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage(lang.id)}
            className={cn(
              'font-mono',
              language === lang.id
                ? 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white border-fuchsia-500'
                : 'border-neutral-700 text-neutral-400 hover:border-fuchsia-500/50 hover:text-fuchsia-400'
            )}
          >
            <span className="w-6 text-xs opacity-60 mr-1">{lang.icon}</span>
            {lang.label}
          </Button>
        ))}
      </div>

      {/* Action Selector */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ACTIONS.map((act) => (
              <motion.button
                key={act.id}
                onClick={() => setAction(act.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'p-3 rounded-xl border transition-all text-left',
                  action === act.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/10'
                    : 'border-neutral-700 hover:border-neutral-600 bg-neutral-900/50'
                )}
              >
                <act.icon className={cn(
                  'w-5 h-5 mb-2',
                  action === act.id ? 'text-fuchsia-400' : 'text-neutral-500'
                )} />
                <p className={cn(
                  'font-mono text-sm font-medium',
                  action === act.id ? 'text-fuchsia-400' : 'text-neutral-300'
                )}>
                  {act.label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{act.description}</p>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Input */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Terminal className="w-5 h-5 text-fuchsia-400 mt-3" />
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  action === 'generate'
                    ? 'Describe what code you want to generate...'
                    : action === 'improve'
                    ? 'Describe how you want to improve the code...'
                    : action === 'debug'
                    ? 'Describe the bug or issue...'
                    : action === 'explain'
                    ? 'What do you want explained about the code?'
                    : 'Which language do you want to convert to?'
                }
                className="min-h-[100px] bg-black/50 border-neutral-700 text-white font-mono text-sm resize-none focus:border-fuchsia-500/50"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {SAMPLE_PROMPTS.slice(0, 3).map((sample, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrompt(sample)}
                    className="text-xs text-neutral-500 hover:text-fuchsia-400 font-mono"
                  >
                    {sample.slice(0, 40)}...
                  </Button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-mono"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {action === 'generate' ? 'GENERATE' : action.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Editor */}
      <Card className="border-neutral-800 bg-neutral-900/50 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-black/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-xs text-neutral-500 font-mono">
              {language.toUpperCase()} • {code.split('\n').length} lines
            </span>
          </div>
          <div className="flex items-center gap-2">
            {language === 'javascript' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRunCode}
                className="text-green-400 hover:text-green-300 hover:bg-green-500/10 font-mono text-xs"
              >
                <Play className="w-4 h-4 mr-1" />
                RUN
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-neutral-400 hover:text-white font-mono text-xs"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-neutral-400 hover:text-white font-mono text-xs"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-neutral-400 hover:text-red-400 font-mono text-xs"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// Your code will appear here...
// Or paste existing code to improve, debug, or explain it"
            className="min-h-[400px] bg-black border-0 text-green-400 font-mono text-sm resize-none rounded-none p-4 focus:ring-0"
            style={{ lineHeight: '1.6' }}
          />
          {isLoading && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400 mx-auto mb-2" />
                <p className="text-fuchsia-400 font-mono text-sm">
                  {action === 'generate' ? 'Generating code...' :
                   action === 'improve' ? 'Improving code...' :
                   action === 'debug' ? 'Debugging...' :
                   action === 'explain' ? 'Analyzing...' : 'Converting...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Output Panel */}
      <AnimatePresence>
        {output && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center justify-between p-3 border-b border-neutral-800">
                <span className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  OUTPUT
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOutput(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <CardContent className="p-4">
                <pre className="text-sm text-cyan-300 font-mono whitespace-pre-wrap">
                  {output}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Tips */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-4">
          <p className="text-xs text-neutral-500 font-mono mb-2">QUICK TIPS</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-neutral-400">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-400 flex-shrink-0 mt-0.5" />
              <span>Use <strong>Generate</strong> to create new code from a description</span>
            </div>
            <div className="flex items-start gap-2">
              <Wand2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>Use <strong>Improve</strong> to optimize and add comments</span>
            </div>
            <div className="flex items-start gap-2">
              <Bug className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>Use <strong>Debug</strong> to find and fix issues</span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>Use <strong>Convert</strong> to change between languages</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  FolderOpen,
  Trash2,
  Play,
  Code2,
  Calendar,
  Search,
  FileCode,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SavedProject {
  id: string
  name: string
  html: string
  css: string
  js: string
  created_at: string
  updated_at: string
}

export default function SavedProjectsPage() {
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('playground_projects') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (data) setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
    setIsLoading(false)
  }

  const loadProject = (project: SavedProject) => {
    // Save to localStorage so main page can load it
    localStorage.setItem('playground_code', JSON.stringify({
      html: project.html,
      css: project.css,
      js: project.js,
      projectName: project.name,
      projectId: project.id
    }))
    router.push('/app/tools/playground')
  }

  const previewProject = (project: SavedProject) => {
    // Save to localStorage for preview page
    localStorage.setItem('playground_code', JSON.stringify({
      html: project.html,
      css: project.css,
      js: project.js,
      projectName: project.name
    }))
    router.push('/app/tools/playground/preview')
  }

  const deleteProject = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('playground_projects') as any).delete().eq('id', id)
      setProjects(p => p.filter(proj => proj.id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app/tools/playground">
              <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="w-px h-6 bg-neutral-700" />
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Saved Projects</h1>
                <p className="text-neutral-400 text-sm">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-12 bg-neutral-900 border-neutral-800 text-white h-12 text-lg focus-visible:ring-violet-500"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-5xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-neutral-400">Loading projects...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileCode className="w-16 h-16 text-neutral-700 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No matching projects' : 'No saved projects yet'}
            </h2>
            <p className="text-neutral-400 mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Create something in the playground and save it!'}
            </p>
            {!searchQuery && (
              <Link href="/app/tools/playground">
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Code2 className="w-4 h-4 mr-2" />
                  Start Building
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden hover:border-violet-500/50 transition-all"
              >
                {/* Preview thumbnail - shows first 100 chars of HTML */}
                <div className="h-32 bg-neutral-950 p-4 border-b border-neutral-800 overflow-hidden">
                  <pre className="text-xs text-neutral-600 font-mono whitespace-pre-wrap line-clamp-5">
                    {project.html || '// Empty HTML'}
                  </pre>
                </div>

                {/* Project Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white text-lg mb-2 truncate">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(project.updated_at)}</span>
                    <span className="text-neutral-700">•</span>
                    <span>{formatTime(project.updated_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => loadProject(project)}
                      className="flex-1 bg-violet-600 hover:bg-violet-700"
                    >
                      <Code2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => previewProject(project)}
                      className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteProject(project.id, project.name)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

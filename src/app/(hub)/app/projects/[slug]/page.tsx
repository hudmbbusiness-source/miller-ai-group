'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { PROJECTS } from '@/types'
import { ChevronLeft, AlertCircle, ExternalLink, Plus, Trash2, Loader2, Save, Github, Globe, FileText, Edit2 } from 'lucide-react'

interface ProjectData {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  status: 'not_connected' | 'in_development' | 'live' | 'paused' | 'archived'
  is_featured: boolean
}

interface ProjectLink {
  id: string
  label: string
  url: string
  icon: string | null
}

const statusConfig = {
  'not_connected': { label: 'Not Connected', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  'in_development': { label: 'In Development', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  'live': { label: 'Live', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  'paused': { label: 'Paused', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  'archived': { label: 'Archived', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

const iconOptions = [
  { value: 'github', label: 'GitHub', icon: Github },
  { value: 'globe', label: 'Website', icon: Globe },
  { value: 'docs', label: 'Documentation', icon: FileText },
  { value: 'external', label: 'External', icon: ExternalLink },
]

export default function PrivateProjectPage() {
  const params = useParams()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [links, setLinks] = useState<ProjectLink[]>([])
  const [editing, setEditing] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  // Edit form state
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<ProjectData['status']>('not_connected')

  // New link form state
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkIcon, setNewLinkIcon] = useState('external')

  // Get static project data as fallback
  const staticProject = PROJECTS.find((p) => p.slug === slug)

  const fetchProject = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Try to get from database first
    const { data: dbProject } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .single()

    if (dbProject) {
      const proj = dbProject as ProjectData
      setProject(proj)
      setEditDescription(proj.description || '')
      setEditStatus(proj.status || 'not_connected')

      // Fetch links
      const { data: projectLinks } = await supabase
        .from('project_links')
        .select('*')
        .eq('project_id', proj.id)
        .order('order_index')

      setLinks((projectLinks || []) as ProjectLink[])
    } else if (staticProject) {
      // Use static data if no DB entry
      setProject({
        id: '',
        slug: staticProject.slug,
        name: staticProject.name,
        tagline: staticProject.description,
        description: staticProject.longDescription,
        logo_url: null,
        status: staticProject.status === 'active' ? 'live' : staticProject.status === 'development' ? 'in_development' : 'not_connected',
        is_featured: true,
      })
      setEditDescription(staticProject.longDescription)
      setEditStatus(staticProject.status === 'active' ? 'live' : staticProject.status === 'development' ? 'in_development' : 'not_connected')
    }

    setLoading(false)
  }, [slug, staticProject])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject()
  }, [fetchProject])

  const handleSave = async () => {
    if (!project) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (project.id) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('projects') as any)
        .update({
          description: editDescription,
          status: editStatus,
        })
        .eq('id', project.id)
    } else {
      // Create new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('projects') as any)
        .insert({
          slug: project.slug,
          name: project.name,
          tagline: project.tagline,
          description: editDescription,
          status: editStatus,
          is_featured: true,
          user_id: user.id,
          order_index: 0,
        })
        .select()
        .single()

      if (data) {
        setProject({ ...project, id: data.id })
      }
    }

    setSaving(false)
    setEditing(false)
    fetchProject()
  }

  const handleAddLink = async () => {
    if (!project?.id || !newLinkLabel || !newLinkUrl) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('project_links') as any)
      .insert({
        project_id: project.id,
        user_id: user.id,
        label: newLinkLabel,
        url: newLinkUrl,
        icon: newLinkIcon,
        order_index: links.length,
      })

    setNewLinkLabel('')
    setNewLinkUrl('')
    setNewLinkIcon('external')
    setLinkDialogOpen(false)
    fetchProject()
  }

  const handleDeleteLink = async (linkId: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('project_links') as any).delete().eq('id', linkId)
    fetchProject()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project && !staticProject) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button asChild className="mt-4">
          <Link href="/app">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const displayProject = project || {
    name: staticProject?.name || 'Unknown',
    description: staticProject?.longDescription || '',
    status: 'not_connected' as const,
    tagline: staticProject?.description || '',
  }

  const LinkIcon = ({ icon }: { icon: string | null }) => {
    const config = iconOptions.find(o => o.value === icon)
    const Icon = config?.icon || ExternalLink
    return <Icon className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/app">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{displayProject.name}</h1>
          <Badge variant="outline" className={statusConfig[displayProject.status]?.color}>
            {statusConfig[displayProject.status]?.label}
          </Badge>
        </div>
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          <Edit2 className="w-4 h-4 mr-2" />
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {displayProject.tagline && (
        <p className="text-lg text-muted-foreground">{displayProject.tagline}</p>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ProjectData['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{displayProject.description || 'No description yet.'}</p>
          </CardContent>
        </Card>
      )}

      {/* Integration Status */}
      <Card className={`border-2 ${
        displayProject.status === 'live' ? 'border-green-500/30 bg-green-500/5' :
        displayProject.status === 'in_development' ? 'border-yellow-500/30 bg-yellow-500/5' :
        'border-gray-500/30 bg-gray-500/5'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {displayProject.status === 'live'
              ? 'This project is live and connected to the hub.'
              : displayProject.status === 'in_development'
              ? 'This project is currently being developed.'
              : 'This project is not yet connected to the hub.'}
          </p>
        </CardContent>
      </Card>

      {/* Links Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Links</CardTitle>
              <CardDescription>External links for this project</CardDescription>
            </div>
            <Button size="sm" onClick={() => setLinkDialogOpen(true)} disabled={!project?.id}>
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {project?.id ? 'No links added yet.' : 'Save the project first to add links.'}
            </p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:text-primary transition-colors"
                  >
                    <LinkIcon icon={link.icon} />
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="GitHub Repository"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={newLinkIcon} onValueChange={setNewLinkIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLink} disabled={!newLinkLabel || !newLinkUrl}>
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

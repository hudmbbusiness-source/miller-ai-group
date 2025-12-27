'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit2, Trash2, Loader2, ExternalLink, Link2, Sparkles } from 'lucide-react'
import type { Tables } from '@/types/database'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type SavedLink = Tables<'saved_links'>

const linkSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tags: z.string().optional(),
  category: z.string().optional(),
  favicon: z.string().optional(),
})

type LinkFormData = z.infer<typeof linkSchema>

interface Metadata {
  title: string | null
  description: string | null
  favicon: string | null
  siteName: string | null
  image: string | null
}

const categories = ['General', 'Reference', 'Tool', 'Article', 'Video', 'Documentation', 'Other']

function LinksContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [links, setLinks] = useState<SavedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [lastFetchedUrl, setLastFetchedUrl] = useState('')

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      tags: '',
      category: 'General',
      favicon: '',
    },
  })

  // Auto-fetch metadata when URL changes
  const fetchMetadata = useCallback(async (url: string) => {
    if (!url || lastFetchedUrl === url) return

    // Validate URL format before fetching
    try {
      new URL(url)
    } catch {
      return
    }

    setFetchingMetadata(true)
    setLastFetchedUrl(url)

    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.metadata) {
          const meta = data.metadata as Metadata
          // Only update if fields are empty (don't overwrite user edits)
          if (!form.getValues('title')) {
            form.setValue('title', meta.title || '')
          }
          if (!form.getValues('description') && meta.description) {
            form.setValue('description', meta.description)
          }
          if (meta.favicon) {
            form.setValue('favicon', meta.favicon)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error)
    } finally {
      setFetchingMetadata(false)
    }
  }, [form, lastFetchedUrl])

  const fetchLinks = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('saved_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setLinks(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const openNewDialog = useCallback(() => {
    setEditingLink(null)
    setLastFetchedUrl('')
    form.reset({
      url: '',
      title: '',
      description: '',
      tags: '',
      category: 'General',
      favicon: '',
    })
    setDialogOpen(true)
  }, [form])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openNewDialog()
      router.replace('/app/links')
    }
  }, [searchParams, router, openNewDialog])

  const openEditDialog = (link: SavedLink) => {
    setEditingLink(link)
    setLastFetchedUrl(link.url) // Don't re-fetch for existing links
    form.reset({
      url: link.url,
      title: link.title,
      description: link.description || '',
      tags: link.tags?.join(', ') || '',
      category: link.category || 'General',
      favicon: link.favicon || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async (data: LinkFormData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const linkData = {
      url: data.url,
      title: data.title,
      description: data.description || null,
      tags: data.tags?.split(',').map(t => t.trim()).filter(Boolean) || null,
      category: data.category || null,
      favicon: data.favicon || null,
      user_id: user.id,
    }

    if (editingLink) {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('saved_links').update(linkData).eq('id', editingLink.id)
    } else {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('saved_links').insert(linkData)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchLinks()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return

    const supabase = createClient()
    await supabase.from('saved_links').delete().eq('id', id)
    fetchLinks()
  }

  // Get unique categories from links
  const usedCategories = Array.from(new Set(links.map(l => l.category).filter(Boolean)))

  // Filter links
  const filteredLinks = links.filter(link => {
    const matchesSearch = search === '' ||
      link.title.toLowerCase().includes(search.toLowerCase()) ||
      link.url.toLowerCase().includes(search.toLowerCase()) ||
      (link.description?.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = categoryFilter === '' || link.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Links</h1>
          <p className="text-muted-foreground mt-1">Save and organize useful links.</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Link
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {usedCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {usedCategories.map(cat => (
                <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Links List */}
      {filteredLinks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {links.length === 0 ? 'No links saved yet' : 'No links match your filters'}
            </p>
            {links.length === 0 && (
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Save your first link
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLinks.map(link => (
            <Card key={link.id} className="group hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {link.favicon ? (
                    <img
                      src={link.favicon}
                      alt=""
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        // Fallback to Link2 icon on error
                        (e.target as HTMLImageElement).style.display = 'none'
                        const parent = (e.target as HTMLImageElement).parentElement
                        if (parent) {
                          parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
                        }
                      }}
                    />
                  ) : (
                    <Link2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {link.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-sm text-muted-foreground truncate">
                        {link.url}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(link)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(link.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {link.description && (
                    <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {link.category && (
                      <Badge variant="outline">{link.category}</Badge>
                    )}
                    {link.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLink ? 'Edit Link' : 'Add Link'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  {...form.register('url')}
                  placeholder="https://..."
                  onBlur={(e) => {
                    if (e.target.value && !editingLink) {
                      fetchMetadata(e.target.value)
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fetchMetadata(form.getValues('url'))}
                  disabled={fetchingMetadata || !form.getValues('url')}
                  title="Auto-fetch title & description"
                >
                  {fetchingMetadata ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {fetchingMetadata && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching page info...
                </p>
              )}
              {form.formState.errors.url && (
                <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="Link title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                {...form.register('tags')}
                placeholder="work, reference"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingLink ? 'Save Changes' : 'Add Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LinksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LinksContent />
    </Suspense>
  )
}

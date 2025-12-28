'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  Upload,
} from 'lucide-react'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

type Board = Tables<'boards'>
type Pin = Tables<'pins'>
type _PinInsert = InsertTables<'pins'>
type _PinUpdate = UpdateTables<'pins'>

export default function BoardDetailPage() {
  const params = useParams()
  const _router = useRouter()
  const boardId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [board, setBoard] = useState<Board | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPin, setEditingPin] = useState<Pin | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [pinType, setPinType] = useState<'link' | 'image'>('link')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: boardData } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    const { data: pinsData } = await supabase
      .from('pins')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })

    if (boardData) {
      setBoard(boardData)
    }
    if (pinsData) {
      setPins(pinsData)
    }
    setLoading(false)
  }, [boardId])

  useEffect(() => {
    // Initial data fetch on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  const openNewDialog = () => {
    setEditingPin(null)
    setPinType('link')
    setTitle('')
    setUrl('')
    setNotes('')
    setTags('')
    setSelectedFile(null)
    setPreviewUrl(null)
    setDialogOpen(true)
  }

  const openEditDialog = (pin: Pin) => {
    setEditingPin(pin)
    setPinType(pin.type)
    setTitle(pin.title)
    setUrl(pin.url || '')
    setNotes(pin.notes || '')
    setTags(pin.tags?.join(', ') || '')
    setSelectedFile(null)
    setPreviewUrl(pin.image_path || null)
    setDialogOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let imagePath = editingPin?.image_path || null

    // Upload image if selected
    if (selectedFile && pinType === 'image') {
      setUploading(true)
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('board-images')
        .upload(fileName, selectedFile)

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('board-images')
          .getPublicUrl(data.path)
        imagePath = urlData.publicUrl
      }
      setUploading(false)
    }

    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean)

    const pinPayload = {
      board_id: boardId,
      user_id: user.id,
      type: pinType,
      title,
      url: pinType === 'link' ? url : null,
      image_path: pinType === 'image' ? imagePath : null,
      notes: notes || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
    }

    if (editingPin) {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('pins').update(pinPayload).eq('id', editingPin.id)
    } else {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('pins').insert(pinPayload)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pin?')) return

    const supabase = createClient()
    await supabase.from('pins').delete().eq('id', id)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Board not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/app/boards">Back to Boards</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/app/boards">
              <ChevronLeft className="w-4 h-4 mr-2" />
              All Boards
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{board.name}</h1>
          {board.description && (
            <p className="text-muted-foreground mt-1">{board.description}</p>
          )}
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Pin
        </Button>
      </div>

      {/* Pins Masonry Grid */}
      {pins.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No pins yet</p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first pin
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {pins.map(pin => (
            <Card key={pin.id} className="break-inside-avoid group hover:border-primary/50 transition-colors">
              {pin.type === 'image' && pin.image_path && (
                <div className="relative">
                  <Image
                    src={pin.image_path}
                    alt={pin.title}
                    width={400}
                    height={300}
                    className="w-full rounded-t-lg"
                    unoptimized
                  />
                </div>
              )}
              {pin.type === 'link' && (
                <div className="bg-muted p-4 rounded-t-lg flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{pin.title}</h3>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(pin)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(pin.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {pin.notes && (
                  <p className="text-sm text-muted-foreground mb-2">{pin.notes}</p>
                )}
                {pin.url && (
                  <a
                    href={pin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Visit Link
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {pin.tags && pin.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {pin.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Pin Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPin ? 'Edit Pin' : 'Add Pin'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pin Type</Label>
              <Select
                value={pinType}
                onValueChange={(v) => setPinType(v as 'link' | 'image')}
                disabled={!!editingPin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">
                    <span className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Link
                    </span>
                  </SelectItem>
                  <SelectItem value="image">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Image
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pin title"
              />
            </div>

            {pinType === 'link' && (
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            {pinType === 'image' && (
              <div className="space-y-2">
                <Label>Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {previewUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="inspiration, reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading || !title.trim() || (pinType === 'link' && !url.trim())}
            >
              {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPin ? 'Save Changes' : 'Add Pin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

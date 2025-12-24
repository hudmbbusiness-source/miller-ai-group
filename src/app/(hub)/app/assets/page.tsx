'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ShoppingBag,
  Plus,
  ExternalLink,
  Trash2,
  Edit2,
  Check,
  Package,
  Heart,
  ImageIcon,
} from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  markAssetOwned,
  type Asset,
} from '@/lib/actions/assets'

const priorityColors = {
  0: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  1: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  2: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const priorityLabels = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
}

const categoryLabels = {
  want: 'Wishlist',
  owned: 'Owned',
  goal: 'Goal',
}

const categoryIcons = {
  want: Heart,
  owned: Package,
  goal: ShoppingBag,
}

// Helper to get proxied image URL for external images
function getImageUrl(url: string | null): string | null {
  if (!url) return null
  // If it's already a Supabase URL or local, use directly
  if (url.includes('supabase.co') || url.startsWith('/')) {
    return url
  }
  // Proxy external images to avoid CORS issues
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [filter, setFilter] = useState<'all' | 'want' | 'owned' | 'goal'>('want')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [category, setCategory] = useState<'want' | 'owned' | 'goal'>('want')
  const [priority, setPriority] = useState<number>(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    setIsLoading(true)
    const data = await getAssets()
    setAssets(data)
    setIsLoading(false)
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setImageUrl('')
    setExternalLink('')
    setCategory('want')
    setPriority(1)
    setNotes('')
    setEditingAsset(null)
  }

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset)
      setName(asset.name)
      setDescription(asset.description || '')
      setImageUrl(asset.image_url || '')
      setExternalLink(asset.external_link || '')
      setCategory(asset.category as 'want' | 'owned' | 'goal')
      setPriority(asset.priority)
      setNotes(asset.notes || '')
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return

    if (editingAsset) {
      await updateAsset(editingAsset.id, {
        name,
        description: description || null,
        image_url: imageUrl || null,
        external_link: externalLink || null,
        category,
        priority,
        notes: notes || null,
      })
    } else {
      await createAsset({
        name,
        description: description || undefined,
        image_url: imageUrl || undefined,
        external_link: externalLink || undefined,
        category,
        priority,
        notes: notes || undefined,
      })
    }

    setIsDialogOpen(false)
    resetForm()
    loadAssets()
  }

  const handleMarkOwned = async (id: string) => {
    await markAssetOwned(id)
    loadAssets()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    await deleteAsset(id)
    loadAssets()
  }

  const filteredAssets = assets.filter((asset) => {
    if (filter === 'all') return true
    return asset.category === filter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assets & Wishlist</h1>
          <p className="text-muted-foreground mt-1">Track things you want, own, or are working towards.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Edit Item' : 'Add Item'}</DialogTitle>
              <DialogDescription>
                {editingAsset ? 'Update item details.' : 'Add something to track.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What is it?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="want">Wishlist</SelectItem>
                      <SelectItem value="owned">Owned</SelectItem>
                      <SelectItem value="goal">Goal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority.toString()} onValueChange={(v) => setPriority(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Low</SelectItem>
                      <SelectItem value="1">Medium</SelectItem>
                      <SelectItem value="2">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image (optional)</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  bucket="board-images"
                  folder="assets"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalLink">Link (optional)</Label>
                <Input
                  id="externalLink"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!name.trim()}>
                {editingAsset ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters - larger touch targets on mobile */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'want' ? 'default' : 'outline'}
          className="h-10 px-4"
          onClick={() => setFilter('want')}
        >
          <Heart className="w-4 h-4 mr-2" />
          Wishlist
        </Button>
        <Button
          variant={filter === 'owned' ? 'default' : 'outline'}
          className="h-10 px-4"
          onClick={() => setFilter('owned')}
        >
          <Package className="w-4 h-4 mr-2" />
          Owned
        </Button>
        <Button
          variant={filter === 'goal' ? 'default' : 'outline'}
          className="h-10 px-4"
          onClick={() => setFilter('goal')}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          Goals
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          className="h-10 px-4"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-32 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3 mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'want'
                ? 'Your wishlist is empty. Add something you want!'
                : filter === 'owned'
                ? 'No owned items tracked yet.'
                : filter === 'goal'
                ? 'No goal items yet.'
                : 'No items found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const CategoryIcon = categoryIcons[asset.category as keyof typeof categoryIcons]
            return (
              <Card key={asset.id} className="overflow-hidden">
                {asset.image_url && (
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(asset.image_url) || ''}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent && !parent.querySelector('.img-placeholder')) {
                          const placeholder = document.createElement('div')
                          placeholder.className = 'img-placeholder absolute inset-0 flex items-center justify-center bg-muted'
                          placeholder.innerHTML = '<svg class="w-12 h-12 text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'
                          parent.appendChild(placeholder)
                        }
                      }}
                    />
                  </div>
                )}
                <CardContent className={asset.image_url ? 'pt-4' : 'py-4'}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{asset.name}</h3>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>
                    {asset.external_link && (
                      <a
                        href={asset.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className={priorityColors[asset.priority as 0 | 1 | 2]}>
                      {priorityLabels[asset.priority as 0 | 1 | 2]}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CategoryIcon className="w-3 h-3" />
                      {categoryLabels[asset.category as keyof typeof categoryLabels]}
                    </Badge>
                  </div>
                  {asset.notes && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {asset.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => handleOpenDialog(asset)}
                    >
                      <Edit2 className="w-5 h-5" />
                    </Button>
                    {asset.category === 'want' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => handleMarkOwned(asset.id)}
                        title="Mark as owned"
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive hover:text-destructive ml-auto"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

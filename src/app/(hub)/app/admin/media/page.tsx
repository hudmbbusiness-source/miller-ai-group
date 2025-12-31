'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Upload,
  Search,
  Grid3X3,
  List,
  Filter,
  MoreVertical,
  Trash2,
  Star,
  Copy,
  ExternalLink,
  X,
  ImageIcon,
  Video,
  Music,
  FileText,
  Sparkles,
  File,
  Loader2,
  Check,
  FolderPlus,
  Heart,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clipboard,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaAsset, MediaCategory, MediaFileType } from '@/lib/actions/media-assets'
import { ensureDefaultCategories, getMediaCategories, createMediaCategory, deleteMediaCategory } from '@/lib/actions/media-assets'

// Upload queue item type
interface UploadQueueItem {
  id: string
  file: File
  name: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  asset?: MediaAsset
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
]

const FILE_TYPE_ICONS: Record<MediaFileType, React.ElementType> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  animation: Sparkles,
  svg: ImageIcon,
  other: File,
}

const FILE_TYPE_COLORS: Record<MediaFileType, string> = {
  image: 'bg-blue-500/20 text-blue-400',
  video: 'bg-red-500/20 text-red-400',
  audio: 'bg-orange-500/20 text-orange-400',
  document: 'bg-green-500/20 text-green-400',
  animation: 'bg-yellow-500/20 text-yellow-400',
  svg: 'bg-purple-500/20 text-purple-400',
  other: 'bg-neutral-500/20 text-neutral-400',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [categories, setCategories] = useState<MediaCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState<MediaFileType | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [globalDragging, setGlobalDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Load assets and categories
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Ensure default categories exist
      await ensureDefaultCategories()

      // Fetch categories
      const cats = await getMediaCategories()
      setCategories(cats)

      // Fetch assets via API
      const params = new URLSearchParams()
      if (fileTypeFilter !== 'all') params.set('file_type', fileTypeFilter)
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (favoritesOnly) params.set('favorites', 'true')

      const response = await fetch(`/api/admin/media?${params.toString()}`)
      const data = await response.json()

      if (data.assets) {
        setAssets(data.assets)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error loading media:', error)
    } finally {
      setLoading(false)
    }
  }, [fileTypeFilter, categoryFilter, searchQuery, favoritesOnly])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Validate file before adding to queue
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
    }
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      return { valid: false, error: `File type ${file.type || 'unknown'} not supported` }
    }
    return { valid: true }
  }

  // Add files to upload queue
  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: UploadQueueItem[] = []

    for (const file of Array.from(files)) {
      const validation = validateFile(file)
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      newItems.push({
        id,
        file,
        name: file.name,
        status: validation.valid ? 'pending' : 'error',
        progress: 0,
        error: validation.error,
      })
    }

    setUploadQueue(prev => [...prev, ...newItems])
    setUploadDialogOpen(true)
  }

  // Upload a single file with progress
  const uploadFile = async (item: UploadQueueItem): Promise<MediaAsset | null> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('name', item.file.name.replace(/\.[^.]+$/, ''))

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadQueue(prev =>
            prev.map(i => i.id === item.id ? { ...i, progress } : i)
          )
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            if (result.success && result.asset) {
              setUploadQueue(prev =>
                prev.map(i => i.id === item.id ? { ...i, status: 'success', progress: 100, asset: result.asset } : i)
              )
              resolve(result.asset)
            } else {
              setUploadQueue(prev =>
                prev.map(i => i.id === item.id ? { ...i, status: 'error', error: result.error || 'Upload failed' } : i)
              )
              resolve(null)
            }
          } catch {
            setUploadQueue(prev =>
              prev.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Invalid response' } : i)
            )
            resolve(null)
          }
        } else {
          setUploadQueue(prev =>
            prev.map(i => i.id === item.id ? { ...i, status: 'error', error: `HTTP ${xhr.status}` } : i)
          )
          resolve(null)
        }
      })

      xhr.addEventListener('error', () => {
        setUploadQueue(prev =>
          prev.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Network error' } : i)
        )
        resolve(null)
      })

      xhr.open('POST', '/api/admin/media')
      xhr.send(formData)

      setUploadQueue(prev =>
        prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i)
      )
    })
  }

  // Process upload queue
  const processUploadQueue = async () => {
    setUploading(true)
    const pendingItems = uploadQueue.filter(i => i.status === 'pending')
    const uploadedAssets: MediaAsset[] = []

    for (const item of pendingItems) {
      const asset = await uploadFile(item)
      if (asset) {
        uploadedAssets.push(asset)
      }
    }

    if (uploadedAssets.length > 0) {
      setAssets(prev => [...uploadedAssets, ...prev])
      setTotal(prev => prev + uploadedAssets.length)
    }

    setUploading(false)
  }

  // Clear completed/failed from queue
  const clearCompletedFromQueue = () => {
    setUploadQueue(prev => prev.filter(i => i.status === 'pending' || i.status === 'uploading'))
  }

  // Remove item from queue
  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => prev.filter(i => i.id !== id))
  }

  // Retry failed upload
  const retryUpload = (id: string) => {
    setUploadQueue(prev =>
      prev.map(i => i.id === id ? { ...i, status: 'pending', progress: 0, error: undefined } : i)
    )
  }

  // Handle paste from clipboard
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      addFilesToQueue(files)
    }
  }, [])

  // Global drag and drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types.includes('Files')) {
        setGlobalDragging(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      if (e.relatedTarget === null) {
        setGlobalDragging(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setGlobalDragging(false)
      if (e.dataTransfer?.files.length) {
        addFilesToQueue(e.dataTransfer.files)
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    document.addEventListener('paste', handlePaste)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  // Legacy handler for file input
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    addFilesToQueue(files)
  }

  // Handle asset deletion
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAssets(prev => prev.filter(a => a.id !== id))
        setTotal(prev => prev - 1)
        setSelectedAsset(null)
        setSelectedAssets(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    for (const id of selectedAssets) {
      await handleDelete(id)
    }
    setSelectedAssets(new Set())
  }

  // Handle favorite toggle
  const handleToggleFavorite = async (asset: MediaAsset) => {
    try {
      const response = await fetch(`/api/admin/media/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !asset.is_favorite }),
      })

      if (response.ok) {
        setAssets(prev =>
          prev.map(a => (a.id === asset.id ? { ...a, is_favorite: !a.is_favorite } : a))
        )
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Copy URL to clipboard
  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const result = await createMediaCategory({
      name: newCategoryName,
      slug,
      color: '#6366f1',
      icon: 'folder',
    })

    if (result.success && result.category) {
      setCategories(prev => [...prev, result.category!])
      setNewCategoryName('')
      setCategoryDialogOpen(false)
    }
  }

  // Asset selection
  const toggleAssetSelection = (id: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Render asset preview
  const renderPreview = (asset: MediaAsset, size: 'thumb' | 'full' = 'thumb') => {
    const sizeClass = size === 'thumb' ? 'w-full h-32 object-cover' : 'max-w-full max-h-[60vh] object-contain'

    switch (asset.file_type) {
      case 'image':
      case 'svg':
        return (
          <img
            src={asset.public_url}
            alt={asset.alt_text || asset.name}
            className={cn(sizeClass, 'rounded-lg')}
          />
        )
      case 'video':
        return size === 'full' ? (
          <video src={asset.public_url} controls className={cn(sizeClass, 'rounded-lg')} />
        ) : (
          <div className="w-full h-32 bg-neutral-800 rounded-lg flex items-center justify-center">
            <Video className="w-8 h-8 text-neutral-500" />
          </div>
        )
      case 'audio':
        return size === 'full' ? (
          <div className="w-full p-8 bg-neutral-800 rounded-lg">
            <audio src={asset.public_url} controls className="w-full" />
          </div>
        ) : (
          <div className="w-full h-32 bg-neutral-800 rounded-lg flex items-center justify-center">
            <Music className="w-8 h-8 text-neutral-500" />
          </div>
        )
      case 'animation':
        if (asset.mime_type === 'image/gif') {
          return (
            <img
              src={asset.public_url}
              alt={asset.alt_text || asset.name}
              className={cn(sizeClass, 'rounded-lg')}
            />
          )
        }
        return (
          <div className="w-full h-32 bg-neutral-800 rounded-lg flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-neutral-500" />
          </div>
        )
      case 'document':
        return size === 'full' && asset.mime_type === 'application/pdf' ? (
          <iframe src={asset.public_url} className="w-full h-[60vh] rounded-lg" />
        ) : (
          <div className="w-full h-32 bg-neutral-800 rounded-lg flex items-center justify-center">
            <FileText className="w-8 h-8 text-neutral-500" />
          </div>
        )
      default:
        return (
          <div className="w-full h-32 bg-neutral-800 rounded-lg flex items-center justify-center">
            <File className="w-8 h-8 text-neutral-500" />
          </div>
        )
    }
  }

  const renderFileTypeIcon = (type: string, className: string = 'w-3 h-3') => {
    switch (type) {
      case 'image':
        return <ImageIcon className={className} />
      case 'video':
        return <Video className={className} />
      case 'audio':
        return <Music className={className} />
      case 'document':
        return <FileText className={className} />
      case 'animation':
        return <Sparkles className={className} />
      case 'svg':
        return <ImageIcon className={className} />
      default:
        return <File className={className} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage your media assets • {total} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            Category
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* File Type Filter */}
            <Select value={fileTypeFilter} onValueChange={(v) => setFileTypeFilter(v as MediaFileType | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="File type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="animation">Animations</SelectItem>
                <SelectItem value="svg">SVGs</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Favorites Toggle */}
            <Button
              variant={favoritesOnly ? 'default' : 'outline'}
              size="icon"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              title="Favorites only"
            >
              <Heart className={cn('w-4 h-4', favoritesOnly && 'fill-current')} />
            </Button>

            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedAssets.size > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-amber-400">
              {selectedAssets.size} item{selectedAssets.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedAssets(new Set())}>
                Clear selection
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Delete selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-neutral-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No media assets yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first asset to get started
            </p>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload files
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {assets.map((asset) => {
            const isSelected = selectedAssets.has(asset.id)
            const fileType = asset.file_type as MediaFileType

            return (
              <Card
                key={asset.id}
                className={cn(
                  'group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-violet-500/50',
                  isSelected && 'ring-2 ring-violet-500'
                )}
                onClick={() => {
                  setSelectedAsset(asset)
                  setPreviewDialogOpen(true)
                }}
              >
                <div className="relative">
                  {renderPreview(asset, 'thumb')}

                  {/* Selection checkbox */}
                  <button
                    className={cn(
                      'absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      isSelected
                        ? 'bg-violet-500 border-violet-500'
                        : 'bg-black/50 border-white/50 opacity-0 group-hover:opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAssetSelection(asset.id)
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Favorite indicator */}
                  {asset.is_favorite && (
                    <div className="absolute top-2 right-2">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </div>
                  )}

                  {/* File type badge */}
                  <Badge
                    className={cn(
                      'absolute bottom-2 left-2 text-xs',
                      FILE_TYPE_COLORS[fileType]
                    )}
                  >
                    {renderFileTypeIcon(asset.file_type, 'w-3 h-3 mr-1')}
                    {asset.file_type}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(asset.file_size)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-white/5">
            {assets.map((asset) => {
              const isSelected = selectedAssets.has(asset.id)
              const fileType = asset.file_type as MediaFileType

              return (
                <div
                  key={asset.id}
                  className={cn(
                    'flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors',
                    isSelected && 'bg-violet-500/10'
                  )}
                  onClick={() => {
                    setSelectedAsset(asset)
                    setPreviewDialogOpen(true)
                  }}
                >
                  {/* Selection checkbox */}
                  <button
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                      isSelected
                        ? 'bg-violet-500 border-violet-500'
                        : 'border-neutral-600 hover:border-neutral-400'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAssetSelection(asset.id)
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 flex items-center justify-center">
                    {asset.file_type === 'image' || asset.file_type === 'svg' ? (
                      <img
                        src={asset.public_url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      renderFileTypeIcon(asset.file_type, 'w-6 h-6 text-neutral-500')
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.mime_type} • {formatFileSize(asset.file_size)}
                    </p>
                  </div>

                  {/* Type badge */}
                  <Badge className={cn('flex-shrink-0', FILE_TYPE_COLORS[fileType])}>
                    {asset.file_type}
                  </Badge>

                  {/* Favorite */}
                  {asset.is_favorite && (
                    <Heart className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />
                  )}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyUrl(asset.public_url) }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleFavorite(asset) }}>
                        <Star className="w-4 h-4 mr-2" />
                        {asset.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={asset.public_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in new tab
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={(e) => { e.stopPropagation(); handleDelete(asset.id) }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Global Drop Overlay */}
      {globalDragging && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="border-4 border-dashed border-violet-500 rounded-3xl p-20 text-center">
            <Upload className="w-16 h-16 mx-auto text-violet-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Drop files to upload</h3>
            <p className="text-neutral-400">Release to add files to the upload queue</p>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open)
        if (!open && !uploading) {
          setUploadQueue([])
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Media
            </DialogTitle>
            <DialogDescription>
              Drag and drop files, paste from clipboard, or click to browse
            </DialogDescription>
          </DialogHeader>

          {/* Drop Zone */}
          <div
            ref={dropZoneRef}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer',
              isDragging
                ? 'border-violet-500 bg-violet-500/10 scale-[1.02]'
                : 'border-neutral-700 hover:border-violet-500/50 hover:bg-violet-500/5',
              uploading && 'opacity-50 pointer-events-none'
            )}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            onDragOver={(e) => { e.preventDefault() }}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (e.dataTransfer.files.length) {
                addFilesToQueue(e.dataTransfer.files)
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center justify-center gap-4">
              <div className="p-3 rounded-full bg-violet-500/10">
                <Upload className="w-6 h-6 text-violet-400" />
              </div>
              <div className="p-3 rounded-full bg-cyan-500/10">
                <Clipboard className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <p className="text-sm font-medium mt-3">
              Drop files, paste images, or click to browse
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Images, videos, audio, documents, animations • Max 100MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.json,.svg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  addFilesToQueue(e.target.files)
                  e.target.value = ''
                }
              }}
            />
          </div>

          {/* Upload Queue */}
          {uploadQueue.length > 0 && (
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Upload Queue ({uploadQueue.length} file{uploadQueue.length > 1 ? 's' : ''})
                </span>
                {uploadQueue.some(i => i.status === 'success' || i.status === 'error') && (
                  <Button variant="ghost" size="sm" onClick={clearCompletedFromQueue}>
                    Clear completed
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {uploadQueue.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3 rounded-lg border transition-colors',
                        item.status === 'success' && 'border-green-500/30 bg-green-500/5',
                        item.status === 'error' && 'border-red-500/30 bg-red-500/5',
                        item.status === 'uploading' && 'border-violet-500/30 bg-violet-500/5',
                        item.status === 'pending' && 'border-neutral-700 bg-neutral-900'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* File icon */}
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(item.file)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <File className="w-5 h-5 text-neutral-500" />
                          )}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span>{formatFileSize(item.file.size)}</span>
                            {item.status === 'uploading' && (
                              <span className="text-violet-400">{item.progress}%</span>
                            )}
                            {item.status === 'success' && (
                              <span className="text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Uploaded
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="text-red-400 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> {item.error}
                              </span>
                            )}
                          </div>

                          {/* Progress bar */}
                          {item.status === 'uploading' && (
                            <Progress value={item.progress} className="h-1 mt-2" />
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {item.status === 'error' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => retryUpload(item.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          {item.status !== 'uploading' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-neutral-500 hover:text-red-400"
                              onClick={() => removeFromQueue(item.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          {item.status === 'uploading' && (
                            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mr-auto">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">Ctrl+V</kbd>
              <span>to paste images</span>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false)
                if (!uploading) setUploadQueue([])
              }}
            >
              {uploading ? 'Close' : 'Cancel'}
            </Button>
            {uploadQueue.some(i => i.status === 'pending') && (
              <Button
                onClick={processUploadQueue}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {uploadQueue.filter(i => i.status === 'pending').length} file{uploadQueue.filter(i => i.status === 'pending').length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAsset.name}</DialogTitle>
                <DialogDescription>
                  {selectedAsset.mime_type} • {formatFileSize(selectedAsset.file_size)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Preview */}
                <div className="flex items-center justify-center bg-neutral-900 rounded-lg p-4">
                  {renderPreview(selectedAsset, 'full')}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyUrl(selectedAsset.public_url)}
                    className="gap-2"
                  >
                    {copiedUrl === selectedAsset.public_url ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedUrl === selectedAsset.public_url ? 'Copied!' : 'Copy URL'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleFavorite(selectedAsset)}
                    className="gap-2"
                  >
                    <Heart className={cn('w-4 h-4', selectedAsset.is_favorite && 'fill-red-500 text-red-500')} />
                    {selectedAsset.is_favorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <a href={selectedAsset.public_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <a href={selectedAsset.public_url} download>
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleDelete(selectedAsset.id)
                      setPreviewDialogOpen(false)
                    }}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">File type</Label>
                    <p>{selectedAsset.file_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Size</Label>
                    <p>{formatFileSize(selectedAsset.file_size)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Uploaded</Label>
                    <p>{new Date(selectedAsset.created_at).toLocaleDateString()}</p>
                  </div>
                  {selectedAsset.width && selectedAsset.height && (
                    <div>
                      <Label className="text-muted-foreground">Dimensions</Label>
                      <p>{selectedAsset.width} x {selectedAsset.height}</p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedAsset.tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAsset.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your media
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Brand Assets"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

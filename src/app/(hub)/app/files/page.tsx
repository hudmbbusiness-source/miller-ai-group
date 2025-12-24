'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Trash2,
  Loader2,
  Download,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Upload,
} from 'lucide-react'
import type { Tables } from '@/types/database'

type FileIndex = Tables<'files_index'>

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function FilesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')

  const fetchFiles = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('files_index')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFiles(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (searchParams.get('upload') === 'true') {
      fileInputRef.current?.click()
      router.replace('/app/files')
    }
  }, [searchParams, router])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles?.length) return

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const file of Array.from(selectedFiles)) {
      const fileExt = file.name.split('.').pop()
      const storagePath = `${user.id}/${Date.now()}-${file.name}`

      const { data, error } = await supabase.storage
        .from('hudson-files')
        .upload(storagePath, file)

      if (!error && data) {
        // @ts-expect-error - Supabase types not fully inferred at build time
        await supabase.from('files_index').insert({
          user_id: user.id,
          filename: file.name,
          storage_path: data.path,
          size: file.size,
          mime_type: file.type || null,
        })
      }
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    fetchFiles()
  }

  const handleDownload = async (file: FileIndex) => {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('hudson-files')
      .download(file.storage_path)

    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleDelete = async (file: FileIndex) => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"?`)) return

    const supabase = createClient()

    // Delete from storage
    await supabase.storage
      .from('hudson-files')
      .remove([file.storage_path])

    // Delete from index
    await supabase.from('files_index').delete().eq('id', file.id)

    fetchFiles()
  }

  // Filter files
  const filteredFiles = files.filter(file =>
    search === '' || file.filename.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground mt-1">Upload and manage your files.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {files.length === 0 ? 'No files uploaded yet' : 'No files match your search'}
            </p>
            {files.length === 0 && (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload your first file
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map(file => {
            const FileIcon = getFileIcon(file.mime_type)
            return (
              <Card key={file.id} className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.filename}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      onClick={() => handleDelete(file)}
                    >
                      <Trash2 className="w-4 h-4" />
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

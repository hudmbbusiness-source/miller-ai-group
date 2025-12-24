'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Loader2, Grid3X3, Image as ImageIcon } from 'lucide-react'
import type { Tables } from '@/types/database'

type Board = Tables<'boards'>

export default function BoardsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const fetchBoards = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setBoards(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openNewDialog()
      router.replace('/app/boards')
    }
  }, [searchParams, router])

  const openNewDialog = () => {
    setEditingBoard(null)
    setName('')
    setDescription('')
    setDialogOpen(true)
  }

  const openEditDialog = (board: Board) => {
    setEditingBoard(board)
    setName(board.name)
    setDescription(board.description || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const boardData = {
      name,
      description,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (editingBoard) {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('boards').update(boardData).eq('id', editingBoard.id)
    } else {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('boards').insert(boardData)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchBoards()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this board and all its pins?')) return

    const supabase = createClient()
    // Delete associated pins first
    await supabase.from('pins').delete().eq('board_id', id)
    await supabase.from('boards').delete().eq('id', id)
    fetchBoards()
  }

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
          <h1 className="text-3xl font-bold">Boards</h1>
          <p className="text-muted-foreground mt-1">Organize your pins in boards.</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Board
        </Button>
      </div>

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No boards yet</p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <Card key={board.id} className="group hover:border-primary/50 transition-colors">
              <Link href={`/app/boards/${board.id}`}>
                <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                  {board.cover_image ? (
                    <img
                      src={board.cover_image}
                      alt={board.name}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                  )}
                </div>
              </Link>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Link href={`/app/boards/${board.id}`}>
                    <CardTitle className="text-lg hover:text-primary transition-colors">
                      {board.name}
                    </CardTitle>
                  </Link>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        openEditDialog(board)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(board.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {board.description && (
                  <CardDescription className="line-clamp-2">
                    {board.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? 'Edit Board' : 'Create Board'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingBoard ? 'Save Changes' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

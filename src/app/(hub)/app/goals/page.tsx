'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  Target,
  Plus,
  CheckCircle2,
  Calendar,
  Trash2,
  Edit2,
  Pause,
} from 'lucide-react'
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  type Goal,
} from '@/lib/actions/goals'

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

const statusColors = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paused: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  abandoned: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const categoryLabels = {
  short_term: 'Short Term',
  long_term: 'Long Term',
  milestone: 'Milestone',
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'short_term' | 'long_term' | 'milestone'>('short_term')
  const [priority, setPriority] = useState<number>(1)
  const [targetDate, setTargetDate] = useState('')

  const loadGoals = useCallback(async () => {
    setIsLoading(true)
    const data = await getGoals()
    setGoals(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGoals()
  }, [loadGoals])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('short_term')
    setPriority(1)
    setTargetDate('')
    setEditingGoal(null)
  }

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal)
      setTitle(goal.title)
      setDescription(goal.description || '')
      setCategory(goal.category as 'short_term' | 'long_term' | 'milestone')
      setPriority(goal.priority)
      setTargetDate(goal.target_date || '')
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return

    if (editingGoal) {
      await updateGoal(editingGoal.id, {
        title,
        description: description || null,
        category,
        priority,
        target_date: targetDate || null,
      })
    } else {
      await createGoal({
        title,
        description: description || undefined,
        category,
        priority,
        target_date: targetDate || undefined,
      })
    }

    setIsDialogOpen(false)
    resetForm()
    loadGoals()
  }

  const handleComplete = async (id: string) => {
    await completeGoal(id)
    loadGoals()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return
    await deleteGoal(id)
    loadGoals()
  }

  const handleStatusChange = async (id: string, status: Goal['status']) => {
    await updateGoal(id, { status })
    loadGoals()
  }

  const filteredGoals = goals.filter((goal) => {
    if (filter === 'all') return true
    if (filter === 'active') return goal.status === 'active'
    if (filter === 'completed') return goal.status === 'completed'
    return true
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground mt-1">Track your short-term and long-term goals.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Goal'}</DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Update your goal details.' : 'Add a new goal to track.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you want to achieve?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
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
                      <SelectItem value="short_term">Short Term</SelectItem>
                      <SelectItem value="long_term">Long Term</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
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
                <Label htmlFor="targetDate">Target Date (optional)</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!title.trim()}>
                {editingGoal ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {/* Goals List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'active'
                ? 'No active goals. Add one to get started!'
                : filter === 'completed'
                ? 'No completed goals yet.'
                : 'No goals found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {goal.status === 'active' ? (
                    <button
                      onClick={() => handleComplete(goal.id)}
                      className="mt-1 text-muted-foreground hover:text-green-500 transition-colors"
                      title="Mark as complete"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="mt-1">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3
                          className={`font-medium ${goal.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={priorityColors[goal.priority as 0 | 1 | 2]}>
                          {priorityLabels[goal.priority as 0 | 1 | 2]}
                        </Badge>
                        <Badge variant="outline">
                          {categoryLabels[goal.category as keyof typeof categoryLabels]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      {goal.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(goal.target_date)}
                        </span>
                      )}
                      <Badge variant="outline" className={statusColors[goal.status]}>
                        {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(goal)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {goal.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStatusChange(goal.id, 'paused')}
                        className="h-8 w-8"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(goal.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

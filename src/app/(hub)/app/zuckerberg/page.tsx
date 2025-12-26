'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit2, Trash2, Loader2, Download, FileText, GraduationCap, Award, Target, Calendar, Briefcase, TrendingUp, DollarSign, Percent, Sparkles, Github, Key, Rocket } from 'lucide-react'
import { PdfViewer } from '@/components/pdf-viewer'
import { AIInsights } from '@/components/hub/ai-insights'
import { GitHubDashboard } from '@/components/hub/github-dashboard'
import { APIConnections } from '@/components/hub/api-connections'
import { InternshipRequirements } from '@/components/hub/internship-requirements'
import { CareerPlanning } from '@/components/hub/career-planning'
import type { Tables } from '@/types/database'
import { CAREER_PATHS, type CareerPath } from '@/types'

type ZProjectItem = Tables<'z_project_items'>

// Sections organized by semester
const semesters = [
  {
    id: 'spring',
    name: 'Spring Semester',
    subtitle: 'Foundation',
    icon: '🌱',
    color: 'bg-green-500/10 border-green-500/20',
  },
  {
    id: 'summer',
    name: 'Summer',
    subtitle: 'Acceleration',
    icon: '☀️',
    color: 'bg-yellow-500/10 border-yellow-500/20',
  },
  {
    id: 'fall',
    name: 'Fall Semester',
    subtitle: 'AI + Capstone',
    icon: '🍂',
    color: 'bg-orange-500/10 border-orange-500/20',
  },
]

const categories = ['Course', 'Certificate', 'Output', 'Interview Prep', 'Other']

// Helper function to format salary
function formatSalary(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`
  }
  return `$${amount.toLocaleString()}`
}

// Career Card Component
function CareerCard({ career, isFounder = false }: { career: CareerPath; isFounder?: boolean }) {
  const probabilityColor = career.probability >= 70
    ? 'text-green-500'
    : career.probability >= 50
    ? 'text-yellow-500'
    : 'text-orange-500'

  return (
    <div className={`p-3 sm:p-4 rounded-lg border ${isFounder ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm sm:text-base mb-1">{career.title}</h4>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{career.description}</p>

          <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
            {career.skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="outline" className="text-[10px] sm:text-xs">
                {skill}
              </Badge>
            ))}
            {career.skills.length > 4 && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                +{career.skills.length - 4}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 sm:text-right shrink-0">
          {career.salaryRange ? (
            <div className="flex items-center gap-1 text-xs sm:text-sm font-medium">
              <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
              <span>{formatSalary(career.salaryRange.min)} - {formatSalary(career.salaryRange.max)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs sm:text-sm font-medium">
              <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
              <span>Equity-based</span>
            </div>
          )}

          <div className={`flex items-center gap-1 text-xs sm:text-sm ${probabilityColor}`}>
            <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{career.probability}% likely</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const defaultSections = [
  'Spring - Courses',
  'Spring - Certificates',
  'Spring - Outputs',
  'Summer - Courses',
  'Summer - Certificates',
  'Summer - Outputs',
  'Fall - Courses',
  'Fall - Certificates',
  'Fall - Outputs',
]

// Default items from The Zuckerberg Project plan
const defaultItems = [
  // Spring - Courses
  { section: 'Spring - Courses', title: 'CS 111 (In Person)', description: 'Core programming and debugging', category: 'Course' },
  { section: 'Spring - Courses', title: 'STAT 121 (In Person, GE)', description: 'Probability and ML intuition', category: 'Course' },
  { section: 'Spring - Courses', title: 'IS 201 (Online)', description: 'Systems and automation', category: 'Course' },
  // Spring - Certificates
  { section: 'Spring - Certificates', title: 'Google IT Automation with Python', description: '6-8 weeks, ~4 hrs/week. Start Week 3.', category: 'Certificate' },
  // Spring - Outputs
  { section: 'Spring - Outputs', title: 'Active GitHub with weekly commits', description: 'Consistent contribution history', category: 'Output' },
  { section: 'Spring - Outputs', title: 'One deployed web application', description: 'Real, production-ready project', category: 'Output' },
  { section: 'Spring - Outputs', title: 'Interview prep started', description: '3-4 days/week practice', category: 'Interview Prep' },
  // Summer - Courses
  { section: 'Summer - Courses', title: 'MATH 112', description: 'Calculus 1', category: 'Course' },
  { section: 'Summer - Courses', title: 'CS 235', description: 'Data Structures & Algorithms', category: 'Course' },
  // Summer - Certificates
  { section: 'Summer - Certificates', title: 'DeepLearning.AI TensorFlow Developer Certificate', description: '8-10 weeks, ~6 hrs/week', category: 'Certificate' },
  // Summer - Outputs
  { section: 'Summer - Outputs', title: '75-120 completed DSA problems', description: 'LeetCode/HackerRank practice', category: 'Output' },
  { section: 'Summer - Outputs', title: 'Second deployed backend-heavy project', description: 'Showcase backend skills', category: 'Output' },
  { section: 'Summer - Outputs', title: 'Internship resume and referral list', description: 'Prepared application materials', category: 'Output' },
  // Fall - Courses
  { section: 'Fall - Courses', title: 'CS 472', description: 'Machine Learning (In Person)', category: 'Course' },
  { section: 'Fall - Courses', title: 'ENT 402', description: 'Entrepreneurial Capstone', category: 'Course' },
  // Fall - Certificates
  { section: 'Fall - Certificates', title: 'DeepLearning.AI Generative AI Specialization', description: '6-8 weeks, ~4 hrs/week. Start Mid-Semester.', category: 'Certificate' },
  // Fall - Outputs
  { section: 'Fall - Outputs', title: 'Production AI feature deployed', description: 'Real AI in production', category: 'Output' },
  { section: 'Fall - Outputs', title: 'One technical case study written', description: 'Document your work', category: 'Output' },
  { section: 'Fall - Outputs', title: 'Internship applications submitted', description: 'Aug-Oct application window', category: 'Output' },
]

export default function ZuckerbergPage() {
  const [items, setItems] = useState<ZProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ZProjectItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)

  // Form state
  const [section, setSection] = useState(defaultSections[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0])

  const fetchItems = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('z_project_items')
      .select('*')
      .eq('user_id', user.id)
      .order('section')
      .order('order_index')

    if (!error && data) {
      setItems(data)
    }
    setLoading(false)
  }, [])

  const initializeDefaultItems = async () => {
    setInitializing(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Insert all default items
    const itemsToInsert = defaultItems.map((item, index) => ({
      ...item,
      user_id: user.id,
      order_index: index,
      completed: false,
    }))

    // @ts-expect-error - Supabase types not fully inferred
    await supabase.from('z_project_items').insert(itemsToInsert)

    setInitializing(false)
    fetchItems()
  }

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const openNewDialog = (sectionName?: string) => {
    setEditingItem(null)
    setSection(sectionName || defaultSections[0])
    setTitle('')
    setDescription('')
    setCategory(categories[0])
    setDialogOpen(true)
  }

  const openEditDialog = (item: ZProjectItem) => {
    setEditingItem(item)
    setSection(item.section)
    setTitle(item.title)
    setDescription(item.description || '')
    setCategory((item as ZProjectItem & { category?: string }).category || categories[0])
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get next order index for section
    const sectionItems = items.filter(i => i.section === section)
    const nextOrder = editingItem
      ? editingItem.order_index
      : Math.max(...sectionItems.map(i => i.order_index), -1) + 1

    const itemData = {
      section,
      title,
      description: description || null,
      category,
      user_id: user.id,
      order_index: nextOrder,
    }

    if (editingItem) {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('z_project_items').update(itemData).eq('id', editingItem.id)
    } else {
      // @ts-expect-error - Supabase types not fully inferred at build time
      await supabase.from('z_project_items').insert(itemData)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchItems()
  }

  const handleToggleComplete = async (item: ZProjectItem) => {
    const supabase = createClient()
    // @ts-expect-error - Supabase types not fully inferred at build time
    await supabase.from('z_project_items').update({ completed: !item.completed }).eq('id', item.id)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const supabase = createClient()
    await supabase.from('z_project_items').delete().eq('id', id)
    fetchItems()
  }

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      project: 'The Zuckerberg Project',
      sections: defaultSections.map(sectionName => ({
        name: sectionName,
        items: items
          .filter(i => i.section === sectionName)
          .map(i => ({
            title: i.title,
            description: i.description,
            completed: i.completed,
          })),
      })),
      stats: {
        total: items.length,
        completed: items.filter(i => i.completed).length,
        pending: items.filter(i => !i.completed).length,
      },
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zuckerberg-project-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Group items by section
  const itemsBySection = defaultSections.reduce((acc, sectionName) => {
    acc[sectionName] = items.filter(i => i.section === sectionName)
    return acc
  }, {} as Record<string, ZProjectItem[]>)

  // Calculate progress
  const totalItems = items.length
  const completedItems = items.filter(i => i.completed).length
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Calculate progress by semester
  const getSemesterProgress = (semesterId: string) => {
    const semesterSections = defaultSections.filter(s => s.toLowerCase().startsWith(semesterId))
    const semesterItems = items.filter(i => semesterSections.includes(i.section))
    const completed = semesterItems.filter(i => i.completed).length
    return semesterItems.length > 0 ? Math.round((completed / semesterItems.length) * 100) : 0
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Course': return <GraduationCap className="w-3 h-3" />
      case 'Certificate': return <Award className="w-3 h-3" />
      case 'Output': return <Target className="w-3 h-3" />
      default: return null
    }
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Course': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'Certificate': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'Output': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'Interview Prep': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">The Zuckerberg Project</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Top-Tier AI Internships + CEO/CTO Founder Track</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" className="h-9 sm:h-10">
            <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Career Snapshot - Top Accessible Roles */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
            <span className="truncate">Career Snapshot - Best Entry Points</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Most accessible management/leadership roles for BYU CS + Business grads
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
            {/* TPM - Best Entry */}
            <div className="p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-500/20 text-green-500 text-[10px] sm:text-xs">3-8% Likelihood</Badge>
              </div>
              <h4 className="font-semibold text-sm sm:text-base mb-1">Technical Program Manager</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Amazon, Google, Meta</p>
              <p className="text-xs sm:text-sm font-medium text-green-500">$120k-$160k + RSUs</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                Amazon recruits at BYU - best entry point
              </p>
            </div>

            {/* BDR - Highest Likelihood */}
            <div className="p-3 sm:p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500/20 text-blue-500 text-[10px] sm:text-xs">15-30% Likelihood</Badge>
              </div>
              <h4 className="font-semibold text-sm sm:text-base mb-1">Business Development Rep</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Google Cloud, AWS, Salesforce</p>
              <p className="text-xs sm:text-sm font-medium text-blue-500">$70k-$90k + OTE $150k</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                Missionary experience is HIGHLY valued
              </p>
            </div>

            {/* Strategy & Ops */}
            <div className="p-3 sm:p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-500/20 text-purple-500 text-[10px] sm:text-xs">2-5% Likelihood</Badge>
              </div>
              <h4 className="font-semibold text-sm sm:text-base mb-1">Strategy & Operations</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Stripe, Uber, DoorDash</p>
              <p className="text-xs sm:text-sm font-medium text-purple-500">$130k-$170k + Equity</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                BYU Marriott School brand helps here
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-medium">Your edge:</span> CS + Business dual focus, technical skills, and leadership experience
              make you competitive for business-track tech roles.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plan" className="space-y-4 sm:space-y-6">
        <TabsList className="flex overflow-x-auto w-full pb-1 sm:pb-0 sm:grid sm:grid-cols-8 gap-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <TabsTrigger value="plan" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">Plan</TabsTrigger>
          <TabsTrigger value="career-hub" className="flex-shrink-0 flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <DollarSign className="w-3 h-3" />
            <span className="hidden sm:inline">Career Hub</span>
            <span className="sm:hidden">Jobs</span>
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex-shrink-0 flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Rocket className="w-3 h-3" />
            <span className="hidden sm:inline">Internships</span>
            <span className="sm:hidden">Apply</span>
          </TabsTrigger>
          <TabsTrigger value="github" className="flex-shrink-0 flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Github className="w-3 h-3" />
            <span className="hidden sm:inline">GitHub</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex-shrink-0 flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Sparkles className="w-3 h-3" />
            AI
          </TabsTrigger>
          <TabsTrigger value="careers" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">Paths</TabsTrigger>
          <TabsTrigger value="connections" className="flex-shrink-0 flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Key className="w-3 h-3" />
            <span className="hidden sm:inline">APIs</span>
          </TabsTrigger>
          <TabsTrigger value="document" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
            <span className="hidden sm:inline">Document</span>
            <span className="sm:hidden">Doc</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-6">
          {/* Empty state - Initialize with default items */}
          {items.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Get Started with Your Plan</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Initialize your Zuckerberg Project with the complete roadmap from the PDF,
                  including all courses, certificates, and required outputs.
                </p>
                <Button onClick={initializeDefaultItems} disabled={initializing}>
                  {initializing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Load Full Plan
                </Button>
              </CardContent>
            </Card>
          )}

          {items.length > 0 && (
            <>
              {/* Overall Progress Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Overall Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {completedItems} of {totalItems} items completed
                  </p>
                  {/* Semester progress indicators */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {semesters.map(sem => (
                      <div key={sem.id} className="text-center">
                        <div className="text-2xl mb-1">{sem.icon}</div>
                        <p className="text-xs text-muted-foreground">{sem.name}</p>
                        <p className="text-sm font-semibold">{getSemesterProgress(sem.id)}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Semesters */}
              {semesters.map(semester => {
                const semesterSections = defaultSections.filter(s =>
                  s.toLowerCase().startsWith(semester.id)
                )
                return (
                  <Card key={semester.id} className={`border ${semester.color}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{semester.icon}</span>
                          <div>
                            <CardTitle>{semester.name}</CardTitle>
                            <CardDescription>{semester.subtitle}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline">{getSemesterProgress(semester.id)}%</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {semesterSections.map(sectionName => {
                        const sectionType = sectionName.split(' - ')[1]
                        return (
                          <div key={sectionName}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                {sectionType}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7"
                                onClick={() => openNewDialog(sectionName)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            </div>
                            {itemsBySection[sectionName]?.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">
                                No items yet
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {itemsBySection[sectionName]?.map(item => (
                                  <div
                                    key={item.id}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 group"
                                  >
                                    <Checkbox
                                      checked={item.completed}
                                      onCheckedChange={() => handleToggleComplete(item)}
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                          {item.title}
                                        </p>
                                        {(item as ZProjectItem & { category?: string }).category && (
                                          <Badge
                                            variant="outline"
                                            className={`text-xs ${getCategoryColor((item as ZProjectItem & { category?: string }).category || '')}`}
                                          >
                                            {getCategoryIcon((item as ZProjectItem & { category?: string }).category || '')}
                                            <span className="ml-1">{(item as ZProjectItem & { category?: string }).category}</span>
                                          </Badge>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEditDialog(item)}
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => handleDelete(item.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}

              {/* Add Item Button */}
              <div className="flex justify-center">
                <Button onClick={() => openNewDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="careers" className="space-y-6">
          {/* Career Outcomes Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Career Outcomes
              </CardTitle>
              <CardDescription>
                Potential career paths based on the Zuckerberg Project trajectory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The Zuckerberg Project is designed to position you for top-tier opportunities in tech.
                Below are the potential career outcomes, organized by category with estimated compensation
                ranges and probability scores based on current progress.
              </p>
            </CardContent>
          </Card>

          {/* Internships */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-500" />
                Internship Opportunities
              </CardTitle>
              <CardDescription>Summer 2025 internship targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {CAREER_PATHS.filter(c => c.category === 'internship').map((career) => (
                  <CareerCard key={career.title} career={career} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Entry Level */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Entry Level Positions
              </CardTitle>
              <CardDescription>Full-time roles post-graduation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {CAREER_PATHS.filter(c => c.category === 'entry').map((career) => (
                  <CareerCard key={career.title} career={career} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mid Level & Senior */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Advanced Roles
              </CardTitle>
              <CardDescription>Mid-level and senior positions (2-5 years)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {CAREER_PATHS.filter(c => c.category === 'mid' || c.category === 'senior').map((career) => (
                  <CareerCard key={career.title} career={career} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Founder Track */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Founder Track
              </CardTitle>
              <CardDescription>Entrepreneurial leadership opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {CAREER_PATHS.filter(c => c.category === 'founder').map((career) => (
                  <CareerCard key={career.title} career={career} isFounder />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="career-hub" className="space-y-6">
          <CareerPlanning />
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <InternshipRequirements />
        </TabsContent>

        <TabsContent value="github" className="space-y-6">
          <GitHubDashboard />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <AIInsights
            completedItems={items.filter(i => i.completed).map(i => i.title)}
            pendingItems={items.filter(i => !i.completed).map(i => i.title)}
            totalItems={items.length}
            completedCount={items.filter(i => i.completed).length}
          />
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          <APIConnections />
        </TabsContent>

        <TabsContent value="document">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Project Document
              </CardTitle>
              <CardDescription>
                The original Zuckerberg Project documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PdfViewer src="/zuckerberg.pdf" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add Checklist Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultSections.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Item title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

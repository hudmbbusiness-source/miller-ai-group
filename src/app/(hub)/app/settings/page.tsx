'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  Check,
  Edit2,
  GraduationCap,
  Briefcase,
  Rocket,
  Award,
  Code2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Target,
  Sparkles,
  Bell,
  Shield,
  X,
} from 'lucide-react'
import { usePreferences } from '@/hooks/use-preferences'
import { Switch } from '@/components/ui/switch'
import { PROJECTS } from '@/types'
import {
  getAllResumeItems,
  createResumeItem,
  updateResumeItem,
  deleteResumeItem,
  updateResumeSummary,
  getResumeSummary,
  type ResumeItem,
  type ResumeSummary,
} from '@/lib/actions/resume'
import {
  getAllAccomplishments,
  createAccomplishment,
  updateAccomplishment,
  deleteAccomplishment,
  type Accomplishment,
} from '@/lib/actions/accomplishments'

const categoryIcons = {
  education: GraduationCap,
  experience: Briefcase,
  startup: Rocket,
  achievement: Award,
  skill: Code2,
  certification: Award,
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // User preferences
  const {
    preferences,
    loading: prefsLoading,
    saving: prefsSaving,
    savePreferences,
  } = usePreferences()
  const [newSkill, setNewSkill] = useState('')
  const [newInterest, setNewInterest] = useState('')
  const [localPrefs, setLocalPrefs] = useState(preferences)

  // Sync local prefs with loaded preferences
  useEffect(() => {
    if (!prefsLoading) {
      setLocalPrefs(preferences)
    }
  }, [preferences, prefsLoading])

  // Resume summary
  const [resumeSummary, setResumeSummary] = useState<ResumeSummary | null>(null)
  const [headline, setHeadline] = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail] = useState('')
  const [summaryText, setSummaryText] = useState('')
  const [website, setWebsite] = useState('')
  const [githubUsername, setGithubUsername] = useState('')

  // Resume items
  const [resumeItems, setResumeItems] = useState<ResumeItem[]>([])
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false)
  const [editingResumeItem, setEditingResumeItem] = useState<ResumeItem | null>(null)
  const [resumeItemTitle, setResumeItemTitle] = useState('')
  const [resumeItemDescription, setResumeItemDescription] = useState('')
  const [resumeItemCategory, setResumeItemCategory] = useState<ResumeItem['category']>('education')
  const [resumeItemStartDate, setResumeItemStartDate] = useState('')
  const [resumeItemEndDate, setResumeItemEndDate] = useState('')
  const [resumeItemIsCurrent, setResumeItemIsCurrent] = useState(false)

  // Accomplishments
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([])
  const [accomplishmentDialogOpen, setAccomplishmentDialogOpen] = useState(false)
  const [editingAccomplishment, setEditingAccomplishment] = useState<Accomplishment | null>(null)
  const [accomplishmentTitle, setAccomplishmentTitle] = useState('')
  const [accomplishmentDescription, setAccomplishmentDescription] = useState('')
  const [accomplishmentCategory, setAccomplishmentCategory] = useState<Accomplishment['category']>('achievement')
  const [accomplishmentDate, setAccomplishmentDate] = useState('')
  const [accomplishmentLink, setAccomplishmentLink] = useState('')

  // Project descriptions (from site_content)
  const [projectDescriptions, setProjectDescriptions] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Fetch resume summary
    const summary = await getResumeSummary()
    if (summary) {
      setResumeSummary(summary)
      setHeadline(summary.headline || '')
      setLocation(summary.location || '')
      setEmail(summary.email || '')
      setSummaryText(summary.summary || '')
      setWebsite(summary.website || '')
    }

    // Fetch resume items
    const items = await getAllResumeItems()
    setResumeItems(items)

    // Fetch accomplishments
    const accs = await getAllAccomplishments()
    setAccomplishments(accs)

    // Fetch project descriptions and settings from site_content
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('site_content') as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('key', 'public_projects')
        .single()

      if (data?.value) {
        setProjectDescriptions(data.value as Record<string, string>)
      }

      // Fetch GitHub username
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: githubData } = await (supabase.from('site_content') as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('key', 'github_username')
        .single()

      if (githubData?.value) {
        setGithubUsername(githubData.value as string)
      }
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveResumeSummary = async () => {
    setSaving(true)
    await updateResumeSummary({
      headline,
      location,
      email,
      summary: summaryText,
      website,
    })

    // Save GitHub username to site_content
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && githubUsername) {
      // @ts-expect-error - Supabase types not fully inferred
      await supabase.from('site_content').upsert({
        key: 'github_username',
        value: githubUsername,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key,user_id' })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveProjects = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // @ts-expect-error - Supabase types not fully inferred
    await supabase.from('site_content').upsert({
      key: 'public_projects',
      value: projectDescriptions,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key,user_id' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Resume item handlers
  const openResumeDialog = (item?: ResumeItem) => {
    if (item) {
      setEditingResumeItem(item)
      setResumeItemTitle(item.title)
      setResumeItemDescription(item.description || '')
      setResumeItemCategory(item.category)
      setResumeItemStartDate(item.start_date || '')
      setResumeItemEndDate(item.end_date || '')
      setResumeItemIsCurrent(item.is_current)
    } else {
      setEditingResumeItem(null)
      setResumeItemTitle('')
      setResumeItemDescription('')
      setResumeItemCategory('education')
      setResumeItemStartDate('')
      setResumeItemEndDate('')
      setResumeItemIsCurrent(false)
    }
    setResumeDialogOpen(true)
  }

  const handleSaveResumeItem = async () => {
    if (!resumeItemTitle.trim()) return
    setSaving(true)

    if (editingResumeItem) {
      await updateResumeItem(editingResumeItem.id, {
        title: resumeItemTitle,
        description: resumeItemDescription || null,
        category: resumeItemCategory,
        start_date: resumeItemStartDate || null,
        end_date: resumeItemEndDate || null,
        is_current: resumeItemIsCurrent,
      })
    } else {
      await createResumeItem({
        title: resumeItemTitle,
        description: resumeItemDescription || undefined,
        category: resumeItemCategory,
        start_date: resumeItemStartDate || undefined,
        end_date: resumeItemEndDate || undefined,
        is_current: resumeItemIsCurrent,
      })
    }

    setSaving(false)
    setResumeDialogOpen(false)
    fetchData()
  }

  const handleDeleteResumeItem = async (id: string) => {
    if (!confirm('Delete this resume item?')) return
    await deleteResumeItem(id)
    fetchData()
  }

  const handleToggleResumeItemVisibility = async (item: ResumeItem) => {
    await updateResumeItem(item.id, { visible: !item.visible })
    fetchData()
  }

  // Accomplishment handlers
  const openAccomplishmentDialog = (item?: Accomplishment) => {
    if (item) {
      setEditingAccomplishment(item)
      setAccomplishmentTitle(item.title)
      setAccomplishmentDescription(item.description || '')
      setAccomplishmentCategory(item.category)
      setAccomplishmentDate(item.date || '')
      setAccomplishmentLink(item.link || '')
    } else {
      setEditingAccomplishment(null)
      setAccomplishmentTitle('')
      setAccomplishmentDescription('')
      setAccomplishmentCategory('achievement')
      setAccomplishmentDate('')
      setAccomplishmentLink('')
    }
    setAccomplishmentDialogOpen(true)
  }

  const handleSaveAccomplishment = async () => {
    if (!accomplishmentTitle.trim()) return
    setSaving(true)

    if (editingAccomplishment) {
      await updateAccomplishment(editingAccomplishment.id, {
        title: accomplishmentTitle,
        description: accomplishmentDescription || null,
        category: accomplishmentCategory,
        date: accomplishmentDate || null,
        link: accomplishmentLink || null,
      })
    } else {
      await createAccomplishment({
        title: accomplishmentTitle,
        description: accomplishmentDescription || undefined,
        category: accomplishmentCategory,
        date: accomplishmentDate || undefined,
        link: accomplishmentLink || undefined,
      })
    }

    setSaving(false)
    setAccomplishmentDialogOpen(false)
    fetchData()
  }

  const handleDeleteAccomplishment = async (id: string) => {
    if (!confirm('Delete this accomplishment?')) return
    await deleteAccomplishment(id)
    fetchData()
  }

  const handleToggleAccomplishmentVisibility = async (item: Accomplishment) => {
    await updateAccomplishment(item.id, { visible: !item.visible })
    fetchData()
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
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your public profile and site content.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="resume">Resume Items</TabsTrigger>
          <TabsTrigger value="accomplishments">Accomplishments</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          {/* Career & Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                Career & Goals
              </CardTitle>
              <CardDescription>
                Set your career goals to personalize AI insights and recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="careerGoal">Career Goal</Label>
                <Textarea
                  id="careerGoal"
                  value={localPrefs.careerGoal}
                  onChange={(e) => setLocalPrefs(p => ({ ...p, careerGoal: e.target.value }))}
                  placeholder="e.g., Become a Senior ML Engineer at a top AI company"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Used by AI Insights to provide personalized recommendations</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    value={localPrefs.targetRole}
                    onChange={(e) => setLocalPrefs(p => ({ ...p, targetRole: e.target.value }))}
                    placeholder="e.g., ML Engineer, Product Manager"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentYear">Current Year</Label>
                  <Select
                    value={localPrefs.currentYear}
                    onValueChange={(v) => setLocalPrefs(p => ({ ...p, currentYear: v as typeof preferences.currentYear }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freshman">Freshman</SelectItem>
                      <SelectItem value="sophomore">Sophomore</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="graduate">Graduate/Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills & Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Skills & Interests
              </CardTitle>
              <CardDescription>
                Used for personalized internship and career recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {localPrefs.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button
                        onClick={() => setLocalPrefs(p => ({
                          ...p,
                          skills: p.skills.filter((_, idx) => idx !== i)
                        }))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill (e.g., Python, React)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSkill.trim()) {
                        setLocalPrefs(p => ({
                          ...p,
                          skills: [...p.skills, newSkill.trim()]
                        }))
                        setNewSkill('')
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newSkill.trim()) {
                        setLocalPrefs(p => ({
                          ...p,
                          skills: [...p.skills, newSkill.trim()]
                        }))
                        setNewSkill('')
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {localPrefs.interests.map((interest, i) => (
                    <Badge key={i} variant="outline" className="flex items-center gap-1">
                      {interest}
                      <button
                        onClick={() => setLocalPrefs(p => ({
                          ...p,
                          interests: p.interests.filter((_, idx) => idx !== i)
                        }))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add an interest (e.g., AI/ML, Startups)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newInterest.trim()) {
                        setLocalPrefs(p => ({
                          ...p,
                          interests: [...p.interests, newInterest.trim()]
                        }))
                        setNewInterest('')
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newInterest.trim()) {
                        setLocalPrefs(p => ({
                          ...p,
                          interests: [...p.interests, newInterest.trim()]
                        }))
                        setNewInterest('')
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your hub.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setLocalPrefs(p => ({ ...p, theme: 'light' }))}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${
                      localPrefs.theme === 'light'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-sm">Light</span>
                  </button>
                  <button
                    onClick={() => setLocalPrefs(p => ({ ...p, theme: 'dark' }))}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${
                      localPrefs.theme === 'dark'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="text-sm">Dark</span>
                  </button>
                  <button
                    onClick={() => setLocalPrefs(p => ({ ...p, theme: 'system' }))}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${
                      localPrefs.theme === 'system'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50'
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="text-sm">System</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive updates and reminders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                </div>
                <Switch
                  checked={localPrefs.emailNotifications}
                  onCheckedChange={(checked) => setLocalPrefs(p => ({ ...p, emailNotifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">Get a weekly summary of your progress</p>
                </div>
                <Switch
                  checked={localPrefs.weeklyDigest}
                  onCheckedChange={(checked) => setLocalPrefs(p => ({ ...p, weeklyDigest: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Goal Reminders</p>
                  <p className="text-sm text-muted-foreground">Remind me about upcoming goal deadlines</p>
                </div>
                <Switch
                  checked={localPrefs.goalReminders}
                  onCheckedChange={(checked) => setLocalPrefs(p => ({ ...p, goalReminders: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                Privacy
              </CardTitle>
              <CardDescription>
                Control what information is visible to others.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Public Profile</p>
                  <p className="text-sm text-muted-foreground">Allow others to view your resume page</p>
                </div>
                <Switch
                  checked={localPrefs.publicProfile}
                  onCheckedChange={(checked) => setLocalPrefs(p => ({ ...p, publicProfile: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show GitHub Activity</p>
                  <p className="text-sm text-muted-foreground">Display GitHub stats on your profile</p>
                </div>
                <Switch
                  checked={localPrefs.showGitHub}
                  onCheckedChange={(checked) => setLocalPrefs(p => ({ ...p, showGitHub: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                const success = await savePreferences(localPrefs)
                if (success) {
                  setSaved(true)
                  setTimeout(() => setSaved(false), 2000)
                }
              }}
              disabled={prefsSaving}
              className="w-full sm:w-auto"
            >
              {prefsSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saved ? 'Saved!' : 'Save Preferences'}
            </Button>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resume Summary</CardTitle>
              <CardDescription>
                Your headline and contact info shown on the public resume page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Founder | Innovator"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub Username</Label>
                <Input
                  id="github"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="your-github-username"
                />
                <p className="text-xs text-muted-foreground">Used for GitHub Dashboard in Zuckerberg Project</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">About / Summary</Label>
                <Textarea
                  id="summary"
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="A brief professional summary..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveResumeSummary} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saved ? 'Saved!' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resume Items Tab */}
        <TabsContent value="resume" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Resume Items</h2>
              <p className="text-sm text-muted-foreground">Education, experience, skills, and more.</p>
            </div>
            <Button onClick={() => openResumeDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {resumeItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No resume items yet. Add your first one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {resumeItems.map((item) => {
                const Icon = categoryIcons[item.category] || Award
                return (
                  <Card key={item.id} className={!item.visible ? 'opacity-60' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{item.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                            {!item.visible && (
                              <Badge variant="secondary" className="text-xs">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleResumeItemVisibility(item)}
                            title={item.visible ? 'Hide' : 'Show'}
                          >
                            {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openResumeDialog(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteResumeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Accomplishments Tab */}
        <TabsContent value="accomplishments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Accomplishments</h2>
              <p className="text-sm text-muted-foreground">Awards, press, publications.</p>
            </div>
            <Button onClick={() => openAccomplishmentDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Accomplishment
            </Button>
          </div>

          {accomplishments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No accomplishments yet. Add your first one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {accomplishments.map((item) => (
                <Card key={item.id} className={!item.visible ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{item.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          {!item.visible && (
                            <Badge variant="secondary" className="text-xs">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {item.date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAccomplishmentVisibility(item)}
                          title={item.visible ? 'Hide' : 'Show'}
                        >
                          {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAccomplishmentDialog(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteAccomplishment(item.id)}
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
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Descriptions</CardTitle>
              <CardDescription>
                Customize the descriptions shown for each project on public pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PROJECTS.map(project => (
                <div key={project.slug} className="space-y-2">
                  <Label htmlFor={`project-${project.slug}`}>{project.name}</Label>
                  <Textarea
                    id={`project-${project.slug}`}
                    value={projectDescriptions[project.slug] || project.description}
                    onChange={(e) => setProjectDescriptions(prev => ({
                      ...prev,
                      [project.slug]: e.target.value,
                    }))}
                    rows={2}
                  />
                </div>
              ))}
              <Button onClick={handleSaveProjects} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saved ? 'Saved!' : 'Save Projects'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resume Item Dialog */}
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResumeItem ? 'Edit Resume Item' : 'Add Resume Item'}</DialogTitle>
            <DialogDescription>
              Add education, experience, skills, or other resume entries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={resumeItemCategory} onValueChange={(v) => setResumeItemCategory(v as ResumeItem['category'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="startup">Venture</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="skill">Skill</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resumeTitle">Title</Label>
              <Input
                id="resumeTitle"
                value={resumeItemTitle}
                onChange={(e) => setResumeItemTitle(e.target.value)}
                placeholder="e.g., BS Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resumeDescription">Description (optional)</Label>
              <Textarea
                id="resumeDescription"
                value={resumeItemDescription}
                onChange={(e) => setResumeItemDescription(e.target.value)}
                placeholder="Details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resumeStartDate">Start Date</Label>
                <Input
                  id="resumeStartDate"
                  type="date"
                  value={resumeItemStartDate}
                  onChange={(e) => setResumeItemStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resumeEndDate">End Date</Label>
                <Input
                  id="resumeEndDate"
                  type="date"
                  value={resumeItemEndDate}
                  onChange={(e) => setResumeItemEndDate(e.target.value)}
                  disabled={resumeItemIsCurrent}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCurrent"
                checked={resumeItemIsCurrent}
                onChange={(e) => setResumeItemIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isCurrent">Currently here</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveResumeItem} disabled={saving || !resumeItemTitle.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingResumeItem ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accomplishment Dialog */}
      <Dialog open={accomplishmentDialogOpen} onOpenChange={setAccomplishmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccomplishment ? 'Edit Accomplishment' : 'Add Accomplishment'}</DialogTitle>
            <DialogDescription>
              Add awards, press mentions, or publications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={accomplishmentCategory} onValueChange={(v) => setAccomplishmentCategory(v as Accomplishment['category'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="award">Award</SelectItem>
                  <SelectItem value="press">Press</SelectItem>
                  <SelectItem value="publication">Publication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accTitle">Title</Label>
              <Input
                id="accTitle"
                value={accomplishmentTitle}
                onChange={(e) => setAccomplishmentTitle(e.target.value)}
                placeholder="e.g., Featured in Forbes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accDescription">Description (optional)</Label>
              <Textarea
                id="accDescription"
                value={accomplishmentDescription}
                onChange={(e) => setAccomplishmentDescription(e.target.value)}
                placeholder="Details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accDate">Date</Label>
                <Input
                  id="accDate"
                  type="date"
                  value={accomplishmentDate}
                  onChange={(e) => setAccomplishmentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accLink">Link (optional)</Label>
                <Input
                  id="accLink"
                  value={accomplishmentLink}
                  onChange={(e) => setAccomplishmentLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccomplishmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAccomplishment} disabled={saving || !accomplishmentTitle.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingAccomplishment ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

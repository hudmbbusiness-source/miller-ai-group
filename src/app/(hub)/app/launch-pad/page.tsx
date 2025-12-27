'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Rocket,
  GraduationCap,
  Award,
  Briefcase,
  Target,
  TrendingUp,
  Plus,
  Check,
  Clock,
  AlertCircle,
  DollarSign,
  Building2,
  MapPin,
  ExternalLink,
  Trash2,
  Edit2,
  ChevronRight,
  Sparkles,
  BookOpen,
  Code,
  Brain,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCertificates,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  getJobApplications,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getCareerProfile,
  upsertCareerProfile,
  getLaunchPadStats,
  type Course,
  type Certificate,
  type JobApplication,
  type CareerProfile,
} from '@/lib/actions/launch-pad'

// High-paying tech roles data
const TOP_ROLES = [
  { title: 'ML/AI Engineer', salary: '$180k-$400k', growth: '+32%' },
  { title: 'Quantitative Developer', salary: '$200k-$500k', growth: '+25%' },
  { title: 'Staff Software Engineer', salary: '$250k-$450k', growth: '+18%' },
  { title: 'AI Startup Founder', salary: 'Equity-based', growth: '+45%' },
  { title: 'VP of Engineering', salary: '$300k-$600k', growth: '+15%' },
]

// Recommended certifications for AI/CS entrepreneurship
const RECOMMENDED_CERTS = [
  { name: 'AWS Solutions Architect', provider: 'AWS', cost: 300, hours: 40 },
  { name: 'TensorFlow Developer', provider: 'Google', cost: 100, hours: 30 },
  { name: 'Deep Learning Specialization', provider: 'Coursera/DeepLearning.AI', cost: 49, hours: 80 },
  { name: 'Meta AI Professional', provider: 'Meta', cost: 0, hours: 60 },
  { name: 'Y Combinator Startup School', provider: 'YC', cost: 0, hours: 20 },
]

export default function LaunchPadPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [courses, setCourses] = useState<Course[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [profile, setProfile] = useState<CareerProfile | null>(null)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getLaunchPadStats>>>(null)
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [certDialogOpen, setCertDialogOpen] = useState(false)
  const [appDialogOpen, setAppDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editingCert, setEditingCert] = useState<Certificate | null>(null)
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [coursesData, certsData, appsData, profileData, statsData] = await Promise.all([
        getCourses(),
        getCertificates(),
        getJobApplications(),
        getCareerProfile(),
        getLaunchPadStats(),
      ])
      setCourses(coursesData)
      setCertificates(certsData)
      setApplications(appsData)
      setProfile(profileData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  // Calculate progress metrics
  const courseProgress = stats?.courses?.total
    ? Math.round((stats.courses.completed / stats.courses.total) * 100)
    : 0
  const certProgress = stats?.certificates?.total
    ? Math.round((stats.certificates.completed / stats.certificates.total) * 100)
    : 0

  const statusColors: Record<string, string> = {
    planned: 'bg-zinc-500',
    in_progress: 'bg-amber-500',
    completed: 'bg-green-500',
    dropped: 'bg-red-500',
    interested: 'bg-zinc-500',
    applied: 'bg-blue-500',
    phone_screen: 'bg-purple-500',
    interview: 'bg-amber-500',
    offer: 'bg-green-500',
    accepted: 'bg-emerald-500',
    rejected: 'bg-red-500',
    withdrawn: 'bg-zinc-400',
  }

  async function handleSaveCourse(formData: FormData) {
    const courseData = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      institution: formData.get('institution') as string || 'BYU',
      category: formData.get('category') as Course['category'],
      credits: parseInt(formData.get('credits') as string) || 3,
      semester: formData.get('semester') as string,
      status: formData.get('status') as Course['status'],
      grade: formData.get('grade') as string,
      professor: formData.get('professor') as string,
      notes: formData.get('notes') as string,
    }

    if (editingCourse) {
      const result = await updateCourse(editingCourse.id, courseData)
      if (result) loadData()
    } else {
      const result = await createCourse(courseData)
      if (result) loadData()
    }
    setCourseDialogOpen(false)
    setEditingCourse(null)
  }

  async function handleDeleteCourse(id: string) {
    if (await deleteCourse(id)) loadData()
  }

  async function handleSaveCertificate(formData: FormData) {
    const certData = {
      name: formData.get('name') as string,
      provider: formData.get('provider') as string,
      category: formData.get('category') as Certificate['category'],
      status: formData.get('status') as Certificate['status'],
      cost: parseFloat(formData.get('cost') as string) || null,
      estimated_hours: parseInt(formData.get('hours') as string) || null,
      credential_url: formData.get('credential_url') as string,
      notes: formData.get('notes') as string,
    }

    if (editingCert) {
      const result = await updateCertificate(editingCert.id, certData)
      if (result) loadData()
    } else {
      const result = await createCertificate(certData)
      if (result) loadData()
    }
    setCertDialogOpen(false)
    setEditingCert(null)
  }

  async function handleDeleteCertificate(id: string) {
    if (await deleteCertificate(id)) loadData()
  }

  async function handleSaveApplication(formData: FormData) {
    const appData = {
      company: formData.get('company') as string,
      position: formData.get('position') as string,
      type: formData.get('type') as JobApplication['type'],
      location: formData.get('location') as string,
      remote_type: formData.get('remote_type') as JobApplication['remote_type'],
      salary_min: parseInt(formData.get('salary_min') as string) || null,
      salary_max: parseInt(formData.get('salary_max') as string) || null,
      status: formData.get('status') as JobApplication['status'],
      job_url: formData.get('job_url') as string,
      notes: formData.get('notes') as string,
      is_dream_job: formData.get('is_dream_job') === 'on',
    }

    if (editingApp) {
      const result = await updateJobApplication(editingApp.id, appData)
      if (result) loadData()
    } else {
      const result = await createJobApplication(appData)
      if (result) loadData()
    }
    setAppDialogOpen(false)
    setEditingApp(null)
  }

  async function handleDeleteApplication(id: string) {
    if (await deleteJobApplication(id)) loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Rocket className="w-8 h-8 text-amber-500" />
            Launch Pad
          </h1>
          <p className="text-muted-foreground mt-1">
            Your AI-powered career launchpad for success
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <Sparkles className="w-3 h-3 mr-1" />
            AI + Entrepreneurship Focus
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <GraduationCap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.courses?.completed || 0}/{stats?.courses?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Courses Done</p>
              </div>
            </div>
            <Progress value={courseProgress} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.certificates?.completed || 0}/{stats?.certificates?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Certificates</p>
              </div>
            </div>
            <Progress value={certProgress} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Briefcase className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.applications?.applied || 0}</p>
                <p className="text-xs text-muted-foreground">Applications</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.applications?.offers || 0} offers received
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${Math.round((stats?.applications?.avgSalary || 0) / 1000)}k</p>
                <p className="text-xs text-muted-foreground">Avg Target Salary</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.applications?.dreamJobs || 0} dream jobs tracked
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Target Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                Highest-Paying Roles for AI + Entrepreneurship
              </CardTitle>
              <CardDescription>
                Roles aligned with your strengths in AI and computer science
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TOP_ROLES.map((role, i) => (
                  <div
                    key={role.title}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-amber-500">#{i + 1}</span>
                      <div>
                        <p className="font-medium">{role.title}</p>
                        <p className="text-sm text-muted-foreground">{role.salary}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {role.growth}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Recommended Certifications
              </CardTitle>
              <CardDescription>
                High-impact certifications for AI/ML and startup founders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {RECOMMENDED_CERTS.map((cert) => (
                  <div
                    key={cert.name}
                    className="p-3 rounded-lg border border-border hover:border-purple-500/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setEditingCert(null)
                      setCertDialogOpen(true)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">{cert.provider}</p>
                      </div>
                      <Badge variant="secondary">
                        {cert.cost === 0 ? 'Free' : `$${cert.cost}`}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      ~{cert.hours} hours
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setEditingCourse(null)
                setCourseDialogOpen(true)
              }}
            >
              <BookOpen className="w-6 h-6 text-blue-500" />
              <span>Add Course</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setEditingCert(null)
                setCertDialogOpen(true)
              }}
            >
              <Award className="w-6 h-6 text-purple-500" />
              <span>Add Certificate</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setEditingApp(null)
                setAppDialogOpen(true)
              }}
            >
              <Briefcase className="w-6 h-6 text-green-500" />
              <span>Track Application</span>
            </Button>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">BYU Courses</h2>
            <Button onClick={() => { setEditingCourse(null); setCourseDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>

          {courses.length === 0 ? (
            <Card className="p-8 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No courses tracked yet</p>
              <Button className="mt-4" onClick={() => setCourseDialogOpen(true)}>
                Add Your First Course
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {courses.map((course) => (
                <Card key={course.id} className="overflow-hidden">
                  <div className="flex items-center p-4">
                    <div className={`w-1 h-12 rounded-full mr-4 ${statusColors[course.status]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{course.name}</h3>
                        {course.code && (
                          <Badge variant="outline" className="text-xs">{course.code}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{course.institution}</span>
                        {course.semester && <span>{course.semester}</span>}
                        {course.credits && <span>{course.credits} credits</span>}
                        {course.grade && (
                          <Badge variant="secondary">{course.grade}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={statusColors[course.status]}>
                        {course.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingCourse(course); setCourseDialogOpen(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCourse(course.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Certifications</h2>
            <Button onClick={() => { setEditingCert(null); setCertDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Certificate
            </Button>
          </div>

          {certificates.length === 0 ? (
            <Card className="p-8 text-center">
              <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No certificates tracked yet</p>
              <Button className="mt-4" onClick={() => setCertDialogOpen(true)}>
                Add Your First Certificate
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {certificates.map((cert) => (
                <Card key={cert.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{cert.name}</h3>
                        <p className="text-sm text-muted-foreground">{cert.provider}</p>
                      </div>
                      <Badge className={statusColors[cert.status]}>
                        {cert.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                      {cert.cost !== null && (
                        <span>${cert.cost}</span>
                      )}
                      {cert.estimated_hours && (
                        <span>{cert.estimated_hours}h</span>
                      )}
                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-500 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingCert(cert); setCertDialogOpen(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCertificate(cert.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Job & Internship Applications</h2>
            <Button onClick={() => { setEditingApp(null); setAppDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Application
            </Button>
          </div>

          {applications.length === 0 ? (
            <Card className="p-8 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications tracked yet</p>
              <Button className="mt-4" onClick={() => setAppDialogOpen(true)}>
                Track Your First Application
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id} className={app.is_dream_job ? 'border-amber-500/50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-1 h-16 rounded-full ${statusColors[app.status]}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{app.position}</h3>
                            {app.is_dream_job && (
                              <Badge className="bg-amber-500">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Dream Job
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            {app.company}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            {app.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {app.location}
                              </span>
                            )}
                            <Badge variant="outline">{app.type.replace('_', ' ')}</Badge>
                            <Badge variant="outline">{app.remote_type.replace('_', ' ')}</Badge>
                            {app.salary_min && app.salary_max && (
                              <span className="flex items-center gap-1 text-green-500">
                                <DollarSign className="w-3 h-3" />
                                ${Math.round(app.salary_min/1000)}k - ${Math.round(app.salary_max/1000)}k
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[app.status]}>
                          {app.status.replace('_', ' ')}
                        </Badge>
                        {app.job_url && (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingApp(app); setAppDialogOpen(true); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteApplication(app.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit Course' : 'Add Course'}</DialogTitle>
            <DialogDescription>
              Track your BYU courses and progress
            </DialogDescription>
          </DialogHeader>
          <form action={handleSaveCourse} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingCourse?.name}
                  placeholder="Machine Learning"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editingCourse?.code || ''}
                  placeholder="CS 474"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  name="institution"
                  defaultValue={editingCourse?.institution || 'BYU'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  name="credits"
                  type="number"
                  defaultValue={editingCourse?.credits || 3}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={editingCourse?.category || 'required'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="elective">Elective</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="ge">GE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingCourse?.status || 'planned'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input
                  id="semester"
                  name="semester"
                  defaultValue={editingCourse?.semester || ''}
                  placeholder="Winter 2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  name="grade"
                  defaultValue={editingCourse?.grade || ''}
                  placeholder="A"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="professor">Professor</Label>
              <Input
                id="professor"
                name="professor"
                defaultValue={editingCourse?.professor || ''}
                placeholder="Dr. Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingCourse?.notes || ''}
                placeholder="Any notes about this course..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCourse ? 'Update' : 'Add'} Course
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Certificate Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCert ? 'Edit Certificate' : 'Add Certificate'}</DialogTitle>
            <DialogDescription>
              Track professional certifications
            </DialogDescription>
          </DialogHeader>
          <form action={handleSaveCertificate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cert-name">Certificate Name</Label>
              <Input
                id="cert-name"
                name="name"
                defaultValue={editingCert?.name}
                placeholder="AWS Solutions Architect"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  name="provider"
                  defaultValue={editingCert?.provider}
                  placeholder="AWS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cert-category">Category</Label>
                <Select name="category" defaultValue={editingCert?.category || 'technical'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cert-status">Status</Label>
                <Select name="status" defaultValue={editingCert?.status || 'planned'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  defaultValue={editingCert?.cost || ''}
                  placeholder="300"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Estimated Hours</Label>
                <Input
                  id="hours"
                  name="hours"
                  type="number"
                  defaultValue={editingCert?.estimated_hours || ''}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credential_url">Credential URL</Label>
                <Input
                  id="credential_url"
                  name="credential_url"
                  defaultValue={editingCert?.credential_url || ''}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-notes">Notes</Label>
              <Textarea
                id="cert-notes"
                name="notes"
                defaultValue={editingCert?.notes || ''}
                placeholder="Any notes..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCertDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCert ? 'Update' : 'Add'} Certificate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Application Dialog */}
      <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingApp ? 'Edit Application' : 'Track Application'}</DialogTitle>
            <DialogDescription>
              Track job and internship applications
            </DialogDescription>
          </DialogHeader>
          <form action={handleSaveApplication} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  defaultValue={editingApp?.company}
                  placeholder="Google"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={editingApp?.position}
                  placeholder="ML Engineer"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app-type">Type</Label>
                <Select name="type" defaultValue={editingApp?.type || 'full_time'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote_type">Remote</Label>
                <Select name="remote_type" defaultValue={editingApp?.remote_type || 'on_site'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_site">On Site</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-status">Status</Label>
                <Select name="status" defaultValue={editingApp?.status || 'interested'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="phone_screen">Phone Screen</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={editingApp?.location || ''}
                placeholder="San Francisco, CA"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_min">Min Salary ($)</Label>
                <Input
                  id="salary_min"
                  name="salary_min"
                  type="number"
                  defaultValue={editingApp?.salary_min || ''}
                  placeholder="150000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_max">Max Salary ($)</Label>
                <Input
                  id="salary_max"
                  name="salary_max"
                  type="number"
                  defaultValue={editingApp?.salary_max || ''}
                  placeholder="250000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_url">Job URL</Label>
              <Input
                id="job_url"
                name="job_url"
                defaultValue={editingApp?.job_url || ''}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-notes">Notes</Label>
              <Textarea
                id="app-notes"
                name="notes"
                defaultValue={editingApp?.notes || ''}
                placeholder="Any notes about this application..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_dream_job"
                name="is_dream_job"
                defaultChecked={editingApp?.is_dream_job}
                className="rounded"
              />
              <Label htmlFor="is_dream_job">Mark as Dream Job</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAppDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingApp ? 'Update' : 'Add'} Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

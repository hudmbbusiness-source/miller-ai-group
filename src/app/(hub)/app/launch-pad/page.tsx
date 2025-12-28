'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
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
  DollarSign,
  Building2,
  MapPin,
  ExternalLink,
  Trash2,
  Edit2,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  getLaunchPadStats,
  type Course,
  type Certificate,
  type JobApplication,
  type CareerProfile,
} from '@/lib/actions/launch-pad'
import { AI_COMPANIES, AI_CERTIFICATIONS, DATA_SOURCES } from '@/lib/data/career-data'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

function PremiumCard({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl',
        'border border-border/50 hover:border-violet-500/20',
        'transition-all duration-300',
        'shadow-lg',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

const TOP_ROLES = [
  { title: 'AI Research Scientist (OpenAI)', salary: '$400K-$800K', growth: '+45%', company: 'OpenAI' },
  { title: 'Staff ML Engineer (Anthropic)', salary: '$550K-$759K', growth: '+38%', company: 'Anthropic' },
  { title: 'Senior AI Engineer (NVIDIA)', salary: '$450K-$544K', growth: '+32%', company: 'NVIDIA' },
  { title: 'Research Scientist (DeepMind)', salary: '$400K-$481K', growth: '+28%', company: 'Google' },
  { title: 'ML Engineer (Databricks)', salary: '$350K-$500K', growth: '+25%', company: 'Databricks' },
]

const RECOMMENDED_CERTS = AI_CERTIFICATIONS.slice(0, 5)

export default function LaunchPadPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [courses, setCourses] = useState<Course[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [_profile, setProfile] = useState<CareerProfile | null>(null)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getLaunchPadStats>>>(null)
  const [loading, setLoading] = useState(true)

  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [certDialogOpen, setCertDialogOpen] = useState(false)
  const [appDialogOpen, setAppDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editingCert, setEditingCert] = useState<Certificate | null>(null)
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null)

  const loadData = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const courseProgress = stats?.courses?.total
    ? Math.round((stats.courses.completed / stats.courses.total) * 100)
    : 0
  const certProgress = stats?.certificates?.total
    ? Math.round((stats.certificates.completed / stats.certificates.total) * 100)
    : 0

  const statusColors: Record<string, string> = {
    planned: 'bg-zinc-500',
    in_progress: 'bg-amber-500',
    completed: 'bg-emerald-500',
    dropped: 'bg-red-500',
    interested: 'bg-zinc-500',
    applied: 'bg-blue-500',
    phone_screen: 'bg-purple-500',
    interview: 'bg-amber-500',
    offer: 'bg-emerald-500',
    accepted: 'bg-emerald-600',
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10 text-violet-500" />
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25"
          >
            <Rocket className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
              Launch Pad
            </h1>
            <p className="text-muted-foreground">Your AI-powered career launchpad</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30">
          <Sparkles className="w-3 h-3 mr-1" />
          AI + Entrepreneurship Focus
        </Badge>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: GraduationCap, value: `${stats?.courses?.completed || 0}/${stats?.courses?.total || 0}`, label: 'Courses Done', color: 'blue', progress: courseProgress },
          { icon: Award, value: `${stats?.certificates?.completed || 0}/${stats?.certificates?.total || 0}`, label: 'Certificates', color: 'purple', progress: certProgress },
          { icon: Briefcase, value: stats?.applications?.applied || 0, label: 'Applications', color: 'emerald', extra: `${stats?.applications?.offers || 0} offers` },
          { icon: DollarSign, value: `$${Math.round((stats?.applications?.avgSalary || 0) / 1000)}k`, label: 'Avg Target Salary', color: 'amber', extra: `${stats?.applications?.dreamJobs || 0} dream jobs` },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <PremiumCard className={cn(
              stat.color === 'blue' && 'border-blue-500/20 hover:border-blue-500/40',
              stat.color === 'purple' && 'border-purple-500/20 hover:border-purple-500/40',
              stat.color === 'emerald' && 'border-emerald-500/20 hover:border-emerald-500/40',
              stat.color === 'amber' && 'border-amber-500/20 hover:border-amber-500/40'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className={cn(
                      'p-2.5 rounded-xl bg-gradient-to-br shadow-lg',
                      stat.color === 'blue' && 'from-blue-500 to-cyan-600 shadow-blue-500/25',
                      stat.color === 'purple' && 'from-purple-500 to-fuchsia-600 shadow-purple-500/25',
                      stat.color === 'emerald' && 'from-emerald-400 to-green-500 shadow-emerald-500/25',
                      stat.color === 'amber' && 'from-amber-400 to-orange-500 shadow-amber-500/25'
                    )}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  <div>
                    <motion.p
                      className="text-2xl font-bold"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                    >
                      {stat.value}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
                {stat.progress !== undefined && (
                  <Progress value={stat.progress} className="mt-3 h-1.5" />
                )}
                {stat.extra && (
                  <p className="mt-2 text-xs text-muted-foreground">{stat.extra}</p>
                )}
              </CardContent>
            </PremiumCard>
          </motion.div>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="careers" className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white">AI Careers</TabsTrigger>
          <TabsTrigger value="courses" className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white">Courses</TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white">Certs</TabsTrigger>
          <TabsTrigger value="applications" className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white">Jobs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Target Roles */}
          <motion.div variants={itemVariants}>
            <PremiumCard>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Highest-Paying Roles for AI + Entrepreneurship</CardTitle>
                    <CardDescription>Roles aligned with your strengths in AI and computer science</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {TOP_ROLES.map((role, i) => (
                    <motion.div
                      key={role.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-transparent hover:border-amber-500/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <motion.span
                          className="text-2xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent"
                          whileHover={{ scale: 1.1 }}
                        >
                          #{i + 1}
                        </motion.span>
                        <div>
                          <p className="font-medium">{role.title}</p>
                          <p className="text-sm text-muted-foreground">{role.salary}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {role.growth}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </PremiumCard>
          </motion.div>

          {/* Recommended Certifications */}
          <motion.div variants={itemVariants}>
            <PremiumCard>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/25">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Recommended Certifications</CardTitle>
                    <CardDescription>High-impact certifications for AI/ML and startup founders</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {RECOMMENDED_CERTS.map((cert, index) => (
                    <motion.div
                      key={cert.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setEditingCert(null)
                        setCertDialogOpen(true)
                      }}
                      className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-transparent hover:border-purple-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">{cert.provider}</p>
                        </div>
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                          {cert.cost === 0 ? 'Free' : `$${cert.cost}`}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        ~{cert.hours} hours
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </PremiumCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: BookOpen, label: 'Add Course', color: 'blue', onClick: () => { setEditingCourse(null); setCourseDialogOpen(true); } },
              { icon: Award, label: 'Add Certificate', color: 'purple', onClick: () => { setEditingCert(null); setCertDialogOpen(true); } },
              { icon: Briefcase, label: 'Track Application', color: 'emerald', onClick: () => { setEditingApp(null); setAppDialogOpen(true); } },
            ].map((action) => (
              <motion.div key={action.label} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className={cn(
                    'h-auto py-6 w-full flex flex-col items-center gap-3 rounded-xl border-2',
                    action.color === 'blue' && 'hover:border-blue-500/50 hover:bg-blue-500/5',
                    action.color === 'purple' && 'hover:border-purple-500/50 hover:bg-purple-500/5',
                    action.color === 'emerald' && 'hover:border-emerald-500/50 hover:bg-emerald-500/5'
                  )}
                  onClick={action.onClick}
                >
                  <action.icon className={cn(
                    'w-7 h-7',
                    action.color === 'blue' && 'text-blue-500',
                    action.color === 'purple' && 'text-purple-500',
                    action.color === 'emerald' && 'text-emerald-500'
                  )} />
                  <span className="font-medium">{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        {/* AI Careers Tab */}
        <TabsContent value="careers" className="space-y-6">
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">AI Career Opportunities</h2>
              <p className="text-sm text-muted-foreground">
                Real salary data from{' '}
                <a href={DATA_SOURCES.url} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">
                  Levels.fyi
                </a>
                {' '}(Updated: {DATA_SOURCES.lastUpdated})
              </p>
            </div>
          </motion.div>

          {/* Company Cards */}
          <div className="space-y-6">
            {AI_COMPANIES.map((company, companyIndex) => (
              <motion.div
                key={company.name}
                variants={itemVariants}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: companyIndex * 0.1 }}
              >
                <PremiumCard className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-2 ring-violet-500/20"
                        >
                          <Image
                            src={company.logo}
                            alt={`${company.name} logo`}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                        <div>
                          <CardTitle className="text-xl">{company.name}</CardTitle>
                          <CardDescription className="mt-1">{company.description}</CardDescription>
                        </div>
                      </div>
                      <a href={company.applyUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0">
                          Apply Now
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="bg-violet-500/5">
                        <MapPin className="w-3 h-3 mr-1" />
                        {company.headquarters}
                      </Badge>
                      <Badge variant="outline">Founded {company.founded}</Badge>
                      <Badge variant="outline">{company.employees} employees</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Roles */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-violet-500" />
                        Open Roles & Compensation
                      </h4>
                      <div className="grid gap-2">
                        {company.roles.slice(0, 4).map((role, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ x: 4 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-transparent hover:border-violet-500/20 transition-all"
                          >
                            <div>
                              <p className="font-medium">{role.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {role.level} • {role.location}
                                {role.remote && <span className="text-emerald-500 ml-2">Remote OK</span>}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-500">
                                ${Math.round(role.salaryMin / 1000)}K - ${Math.round(role.salaryMax / 1000)}K
                              </p>
                              <p className="text-xs text-muted-foreground">+ {role.equity} equity</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Internships */}
                    {company.internships.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-purple-500" />
                          Internships
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {company.internships.map((intern, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                              <p className="font-medium">{intern.title}</p>
                              <p className="text-sm text-emerald-500 font-bold">${intern.hourlyRate}/hr</p>
                              <p className="text-xs text-muted-foreground">{intern.duration} • {intern.location}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interview Process */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-500" />
                        Interview Process
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {company.interviewProcess.map((step, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                            {idx + 1}. {step}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Requirements */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        Key Requirements
                      </h4>
                      <ul className="grid sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
                        {company.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-violet-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Source Link */}
                    <div className="pt-2 border-t border-border/50">
                      <a
                        href={company.levelsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-violet-500 flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View salary data on Levels.fyi
                      </a>
                    </div>
                  </CardContent>
                </PremiumCard>
              </motion.div>
            ))}
          </div>

          {/* Data Source Disclaimer */}
          <PremiumCard className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Data Source:</strong> {DATA_SOURCES.primary} •{' '}
                <a href={DATA_SOURCES.url} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">
                  {DATA_SOURCES.url}
                </a>
                <br />
                {DATA_SOURCES.disclaimer}
              </p>
            </CardContent>
          </PremiumCard>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">BYU Courses</h2>
            <Button onClick={() => { setEditingCourse(null); setCourseDialogOpen(true); }} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </motion.div>

          {courses.length === 0 ? (
            <PremiumCard className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-blue-500/50" />
              </div>
              <p className="text-muted-foreground mb-4">No courses tracked yet</p>
              <Button onClick={() => setCourseDialogOpen(true)} className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">
                Add Your First Course
              </Button>
            </PremiumCard>
          ) : (
            <div className="grid gap-3">
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PremiumCard className="overflow-hidden">
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
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">{course.grade}</Badge>
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
                          className="hover:bg-blue-500/10 hover:text-blue-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </PremiumCard>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">Certifications</h2>
            <Button onClick={() => { setEditingCert(null); setCertDialogOpen(true); }} className="bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Certificate
            </Button>
          </motion.div>

          {certificates.length === 0 ? (
            <PremiumCard className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 flex items-center justify-center">
                <Award className="w-8 h-8 text-purple-500/50" />
              </div>
              <p className="text-muted-foreground mb-4">No certificates tracked yet</p>
              <Button onClick={() => setCertDialogOpen(true)} className="bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white border-0">
                Add Your First Certificate
              </Button>
            </PremiumCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {certificates.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PremiumCard className="overflow-hidden h-full">
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
                        {cert.cost !== null && <span>${cert.cost}</span>}
                        {cert.estimated_hours && <span>{cert.estimated_hours}h</span>}
                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-500 hover:underline flex items-center gap-1"
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
                          className="hover:bg-purple-500/10 hover:text-purple-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </PremiumCard>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">Job & Internship Applications</h2>
            <Button onClick={() => { setEditingApp(null); setAppDialogOpen(true); }} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Application
            </Button>
          </motion.div>

          {applications.length === 0 ? (
            <PremiumCard className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-emerald-500/50" />
              </div>
              <p className="text-muted-foreground mb-4">No applications tracked yet</p>
              <Button onClick={() => setAppDialogOpen(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">
                Track Your First Application
              </Button>
            </PremiumCard>
          ) : (
            <div className="space-y-3">
              {applications.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PremiumCard className={app.is_dream_job ? 'border-amber-500/50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-1 h-16 rounded-full ${statusColors[app.status]}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{app.position}</h3>
                              {app.is_dream_job && (
                                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Dream Job
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Building2 className="w-4 h-4" />
                              {app.company}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                              {app.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {app.location}
                                </span>
                              )}
                              <Badge variant="outline">{app.type.replace('_', ' ')}</Badge>
                              <Badge variant="outline">{app.remote_type.replace('_', ' ')}</Badge>
                              {app.salary_min && app.salary_max && (
                                <span className="flex items-center gap-1 text-emerald-500 font-medium">
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
                              <Button variant="ghost" size="icon" className="hover:bg-emerald-500/10 hover:text-emerald-500">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingApp(app); setAppDialogOpen(true); }}
                            className="hover:bg-emerald-500/10 hover:text-emerald-500"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteApplication(app.id)}
                            className="hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </PremiumCard>
                </motion.div>
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
            <DialogDescription>Track your BYU courses and progress</DialogDescription>
          </DialogHeader>
          <form action={handleSaveCourse} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input id="name" name="name" defaultValue={editingCourse?.name} placeholder="Machine Learning" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input id="code" name="code" defaultValue={editingCourse?.code || ''} placeholder="CS 474" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" name="institution" defaultValue={editingCourse?.institution || 'BYU'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input id="credits" name="credits" type="number" defaultValue={editingCourse?.credits || 3} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={editingCourse?.category || 'required'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input id="semester" name="semester" defaultValue={editingCourse?.semester || ''} placeholder="Winter 2025" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input id="grade" name="grade" defaultValue={editingCourse?.grade || ''} placeholder="A" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="professor">Professor</Label>
              <Input id="professor" name="professor" defaultValue={editingCourse?.professor || ''} placeholder="Dr. Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={editingCourse?.notes || ''} placeholder="Any notes about this course..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">{editingCourse ? 'Update' : 'Add'} Course</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Certificate Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCert ? 'Edit Certificate' : 'Add Certificate'}</DialogTitle>
            <DialogDescription>Track professional certifications</DialogDescription>
          </DialogHeader>
          <form action={handleSaveCertificate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cert-name">Certificate Name</Label>
              <Input id="cert-name" name="name" defaultValue={editingCert?.name} placeholder="AWS Solutions Architect" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input id="provider" name="provider" defaultValue={editingCert?.provider} placeholder="AWS" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cert-category">Category</Label>
                <Select name="category" defaultValue={editingCert?.category || 'technical'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost ($)</Label>
                <Input id="cost" name="cost" type="number" defaultValue={editingCert?.cost || ''} placeholder="300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Estimated Hours</Label>
                <Input id="hours" name="hours" type="number" defaultValue={editingCert?.estimated_hours || ''} placeholder="40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credential_url">Credential URL</Label>
                <Input id="credential_url" name="credential_url" defaultValue={editingCert?.credential_url || ''} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-notes">Notes</Label>
              <Textarea id="cert-notes" name="notes" defaultValue={editingCert?.notes || ''} placeholder="Any notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCertDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white border-0">{editingCert ? 'Update' : 'Add'} Certificate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Application Dialog */}
      <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingApp ? 'Edit Application' : 'Track Application'}</DialogTitle>
            <DialogDescription>Track job and internship applications</DialogDescription>
          </DialogHeader>
          <form action={handleSaveApplication} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" defaultValue={editingApp?.company} placeholder="Google" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input id="position" name="position" defaultValue={editingApp?.position} placeholder="ML Engineer" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app-type">Type</Label>
                <Select name="type" defaultValue={editingApp?.type || 'full_time'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input id="location" name="location" defaultValue={editingApp?.location || ''} placeholder="San Francisco, CA" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_min">Min Salary ($)</Label>
                <Input id="salary_min" name="salary_min" type="number" defaultValue={editingApp?.salary_min || ''} placeholder="150000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_max">Max Salary ($)</Label>
                <Input id="salary_max" name="salary_max" type="number" defaultValue={editingApp?.salary_max || ''} placeholder="250000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_url">Job URL</Label>
              <Input id="job_url" name="job_url" defaultValue={editingApp?.job_url || ''} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-notes">Notes</Label>
              <Textarea id="app-notes" name="notes" defaultValue={editingApp?.notes || ''} placeholder="Any notes about this application..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_dream_job" name="is_dream_job" defaultChecked={editingApp?.is_dream_job} className="rounded" />
              <Label htmlFor="is_dream_job">Mark as Dream Job</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAppDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">{editingApp ? 'Update' : 'Add'} Application</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

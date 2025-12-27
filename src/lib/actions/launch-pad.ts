'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Type helper for tables not in generated database types
// These tables are created via migration but not in the auto-generated types
type SupabaseClient = Awaited<ReturnType<typeof createClient>>
type UntypedTable = ReturnType<SupabaseClient['from']>

// Helper to access tables not in generated types
function fromTable(supabase: SupabaseClient, table: string): UntypedTable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table)
}

// Types
export interface Course {
  id: string
  user_id: string
  name: string
  code: string | null
  institution: string
  category: 'required' | 'elective' | 'minor' | 'ge'
  credits: number
  grade: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'dropped'
  semester: string | null
  priority: number
  notes: string | null
  skills: string[]
  professor: string | null
  completion_date: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface Certificate {
  id: string
  user_id: string
  name: string
  provider: string
  category: 'technical' | 'business' | 'design' | 'leadership'
  status: 'planned' | 'in_progress' | 'completed'
  cost: number | null
  estimated_hours: number | null
  priority: number
  skills: string[]
  credential_id: string | null
  credential_url: string | null
  expiration_date: string | null
  completion_date: string | null
  notes: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  user_id: string
  company: string
  position: string
  type: 'internship' | 'full_time' | 'part_time' | 'contract'
  location: string | null
  remote_type: 'on_site' | 'hybrid' | 'remote'
  salary_min: number | null
  salary_max: number | null
  status: 'interested' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn'
  applied_date: string | null
  response_date: string | null
  interview_dates: string[]
  offer_deadline: string | null
  job_url: string | null
  job_description: string | null
  notes: string | null
  contacts: { name: string; title: string; email: string; linkedin: string }[]
  priority: number
  is_dream_job: boolean
  skills_required: string[]
  skills_matched: string[]
  order_index: number
  created_at: string
  updated_at: string
}

export interface CareerProfile {
  id: string
  user_id: string
  target_role: string | null
  target_salary: number | null
  experience_level: 'student' | 'new_grad' | 'mid' | 'senior' | 'lead' | 'executive'
  graduation_date: string | null
  university: string
  major: string | null
  minor: string | null
  gpa: number | null
  strengths: string[]
  interests: string[]
  career_path: string | null
  preferred_companies: string[]
  preferred_locations: string[]
  willing_to_relocate: boolean
  visa_required: boolean
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  resume_url: string | null
  created_at: string
  updated_at: string
}

// ============ COURSES ============

export async function getCourses(): Promise<Course[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await fromTable(supabase, 'courses')
    .select('*')
    .eq('user_id', user.id)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching courses:', error)
    return []
  }

  return data || []
}

export async function createCourse(course: Partial<Course>): Promise<Course | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'courses')
    .insert({ ...course, user_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('Error creating course:', error)
    return null
  }

  revalidatePath('/app/launch-pad')
  return data
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'courses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating course:', error)
    return null
  }

  revalidatePath('/app/launch-pad')
  return data
}

export async function deleteCourse(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await fromTable(supabase, 'courses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting course:', error)
    return false
  }

  revalidatePath('/app/launch-pad')
  return true
}

// ============ CERTIFICATES ============

export async function getCertificates(): Promise<Certificate[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await fromTable(supabase, 'certificates')
    .select('*')
    .eq('user_id', user.id)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching certificates:', error)
    return []
  }

  return data || []
}

export async function createCertificate(cert: Partial<Certificate>): Promise<Certificate | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'certificates')
    .insert({ ...cert, user_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('Error creating certificate:', error)
    return null
  }

  revalidatePath('/app/launch-pad')
  return data
}

export async function updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'certificates')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating certificate:', error)
    return null
  }

  revalidatePath('/app/launch-pad')
  return data
}

export async function deleteCertificate(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await fromTable(supabase, 'certificates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting certificate:', error)
    return false
  }

  revalidatePath('/app/launch-pad')
  return true
}

// ============ JOB APPLICATIONS ============

export async function getJobApplications(): Promise<JobApplication[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await fromTable(supabase, 'job_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching job applications:', error)
    return []
  }

  return data || []
}

export async function createJobApplication(app: Partial<JobApplication>): Promise<JobApplication | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'job_applications')
    .insert({ ...app, user_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('Error creating job application:', error)
    return null
  }

  revalidatePath('/app/launch-pad')
  return data
}

export async function updateJobApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'job_applications')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating job application:', error)
    return null
  }

  revalidatePath('/app/launch-pad')
  return data
}

export async function deleteJobApplication(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await fromTable(supabase, 'job_applications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting job application:', error)
    return false
  }

  revalidatePath('/app/launch-pad')
  return true
}

// ============ CAREER PROFILE ============

export async function getCareerProfile(): Promise<CareerProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'career_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching career profile:', error)
    return null
  }

  return data
}

export async function upsertCareerProfile(profile: Partial<CareerProfile>): Promise<CareerProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await fromTable(supabase, 'career_profiles')
    .upsert({ ...profile, user_id: user.id }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    console.error('Error upserting career profile:', error)
    return null
  }

  revalidatePath('/app/launch-pad')
  return data
}

// ============ STATS ============

export async function getLaunchPadStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [courses, certificates, applications] = await Promise.all([
    fromTable(supabase, 'courses').select('status').eq('user_id', user.id),
    fromTable(supabase, 'certificates').select('status').eq('user_id', user.id),
    fromTable(supabase, 'job_applications').select('status, is_dream_job, salary_min, salary_max').eq('user_id', user.id),
  ])

  const courseData: { status: string }[] = courses.data || []
  const certData: { status: string }[] = certificates.data || []
  const appData: { status: string; is_dream_job: boolean; salary_min: number | null; salary_max: number | null }[] = applications.data || []

  return {
    courses: {
      total: courseData.length,
      completed: courseData.filter((c) => c.status === 'completed').length,
      inProgress: courseData.filter((c) => c.status === 'in_progress').length,
      planned: courseData.filter((c) => c.status === 'planned').length,
    },
    certificates: {
      total: certData.length,
      completed: certData.filter((c) => c.status === 'completed').length,
      inProgress: certData.filter((c) => c.status === 'in_progress').length,
      planned: certData.filter((c) => c.status === 'planned').length,
    },
    applications: {
      total: appData.length,
      applied: appData.filter((a) => ['applied', 'phone_screen', 'interview', 'offer'].includes(a.status)).length,
      offers: appData.filter((a) => a.status === 'offer').length,
      dreamJobs: appData.filter((a) => a.is_dream_job).length,
      avgSalary: appData.length > 0
        ? Math.round(appData.reduce((sum, a) => sum + ((a.salary_min || 0) + (a.salary_max || 0)) / 2, 0) / appData.length)
        : 0,
    },
  }
}

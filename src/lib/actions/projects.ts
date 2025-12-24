'use server'

import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { revalidatePath } from 'next/cache'

export interface Project {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  status: 'not_connected' | 'in_development' | 'live' | 'paused' | 'archived'
  is_featured: boolean
  order_index: number
  created_at: string
}

export interface ProjectLink {
  id: string
  project_id: string
  label: string
  url: string
  icon: string | null
  order_index: number
}

/**
 * Get all projects for owner
 */
export async function getProjects(): Promise<Project[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('projects') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('order_index')

  return (data || []) as Project[]
}

/**
 * Get a single project by slug
 */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const owner = await isOwner()
  if (!owner) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('projects') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .single()

  return data as Project | null
}

/**
 * Create or update a project (owner only)
 */
export async function upsertProject(project: {
  slug: string
  name: string
  tagline?: string
  description?: string
  logo_url?: string
  status?: Project['status']
  is_featured?: boolean
}): Promise<{ success: boolean; error?: string; project?: Project }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can manage projects' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Check if project exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('projects') as any)
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', project.slug)
    .single()

  let result
  if (existing) {
    // Update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('projects') as any)
      .update({
        name: project.name,
        tagline: project.tagline,
        description: project.description,
        logo_url: project.logo_url,
        status: project.status,
        is_featured: project.is_featured,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    result = data
  } else {
    // Insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allProjects } = await (supabase.from('projects') as any)
      .select('order_index')
      .eq('user_id', user.id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = (allProjects?.[0]?.order_index ?? -1) + 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('projects') as any)
      .insert({
        ...project,
        user_id: user.id,
        order_index: nextOrder,
        status: project.status || 'not_connected',
        is_featured: project.is_featured ?? false,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    result = data
  }

  revalidatePath('/app/projects')
  revalidatePath('/projects')
  return { success: true, project: result as Project }
}

/**
 * Delete a project (owner only)
 */
export async function deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can delete projects' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('projects') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/projects')
  revalidatePath('/projects')
  return { success: true }
}

/**
 * Get links for a project
 */
export async function getProjectLinks(projectId: string): Promise<ProjectLink[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('project_links') as any)
    .select('*')
    .eq('project_id', projectId)
    .order('order_index')

  return (data || []) as ProjectLink[]
}

/**
 * Add a link to a project (owner only)
 */
export async function addProjectLink(link: {
  project_id: string
  label: string
  url: string
  icon?: string
}): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can add links' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('project_links') as any)
    .select('order_index')
    .eq('project_id', link.project_id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('project_links') as any)
    .insert({
      ...link,
      user_id: user.id,
      order_index: nextOrder,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/projects')
  return { success: true }
}

/**
 * Delete a project link (owner only)
 */
export async function deleteProjectLink(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can delete links' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('project_links') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/projects')
  return { success: true }
}

/**
 * Initialize default projects if none exist
 */
export async function initializeDefaultProjects(): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can initialize projects' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Check if projects already exist
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('projects') as any)
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true } // Already initialized
  }

  const defaultProjects = [
    {
      slug: 'kachow',
      name: 'Kachow AI',
      tagline: 'AI-powered productivity suite',
      description: 'A comprehensive AI assistant platform for productivity and automation.',
      status: 'in_development' as const,
      is_featured: true,
      order_index: 0,
      user_id: user.id,
    },
    {
      slug: 'stuntman',
      name: 'Stuntman AI',
      tagline: 'AI stunt double for video editing',
      description: 'Revolutionary AI technology for video production and editing.',
      status: 'not_connected' as const,
      is_featured: true,
      order_index: 1,
      user_id: user.id,
    },
    {
      slug: 'brainbox',
      name: 'BrainBox',
      tagline: 'AI-enhanced learning platform',
      description: 'Intelligent learning and knowledge management system.',
      status: 'not_connected' as const,
      is_featured: true,
      order_index: 2,
      user_id: user.id,
    },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('projects') as any)
    .insert(defaultProjects)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/projects')
  return { success: true }
}

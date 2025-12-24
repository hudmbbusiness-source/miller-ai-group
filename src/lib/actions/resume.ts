'use server'

import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { revalidatePath } from 'next/cache'

export interface ResumeSummary {
  id: string
  user_id: string
  summary: string | null
  headline: string | null
  location: string | null
  email: string | null
  phone: string | null
  website: string | null
}

export interface ResumeItem {
  id: string
  title: string
  description: string | null
  category: 'education' | 'startup' | 'achievement' | 'skill' | 'experience' | 'certification'
  start_date: string | null
  end_date: string | null
  is_current: boolean
  order_index: number
  visible: boolean
  created_at: string
}

/**
 * Get all resume items (public - only visible items)
 */
export async function getPublicResumeItems(): Promise<ResumeItem[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('resume_items') as any)
    .select('*')
    .eq('visible', true)
    .order('order_index')

  return (data || []) as ResumeItem[]
}

/**
 * Get all resume items for owner (including hidden)
 */
export async function getAllResumeItems(): Promise<ResumeItem[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('resume_items') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('order_index')

  return (data || []) as ResumeItem[]
}

/**
 * Create a resume item (owner only)
 */
export async function createResumeItem(item: {
  title: string
  description?: string
  category: ResumeItem['category']
  start_date?: string
  end_date?: string
  is_current?: boolean
}): Promise<{ success: boolean; error?: string; item?: ResumeItem }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can add resume items' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get next order index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('resume_items') as any)
    .select('order_index')
    .eq('user_id', user.id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = existing?.[0]?.order_index ?? -1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('resume_items') as any)
    .insert({
      ...item,
      user_id: user.id,
      order_index: nextOrder + 1,
      visible: true,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/resume')
  revalidatePath('/app/settings')
  return { success: true, item: data as ResumeItem }
}

/**
 * Update a resume item (owner only)
 */
export async function updateResumeItem(
  id: string,
  updates: Partial<Omit<ResumeItem, 'id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can update resume items' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('resume_items') as any)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/resume')
  revalidatePath('/app/settings')
  return { success: true }
}

/**
 * Delete a resume item (owner only)
 */
export async function deleteResumeItem(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can delete resume items' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('resume_items') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/resume')
  revalidatePath('/app/settings')
  return { success: true }
}

/**
 * Reorder resume items (owner only)
 */
export async function reorderResumeItems(
  itemIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can reorder items' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Update each item's order_index
  for (let i = 0; i < itemIds.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('resume_items') as any)
      .update({ order_index: i })
      .eq('id', itemIds[i])
      .eq('user_id', user.id)
  }

  revalidatePath('/resume')
  revalidatePath('/app/settings')
  return { success: true }
}

/**
 * Get resume summary (public)
 */
export async function getResumeSummary(): Promise<ResumeSummary | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('resume_summary') as any)
    .select('*')
    .limit(1)
    .single()

  return data as ResumeSummary | null
}

/**
 * Update or create resume summary (owner only)
 */
export async function updateResumeSummary(summary: {
  summary?: string | null
  headline?: string | null
  location?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can update resume summary' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Check if summary exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('resume_summary') as any)
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (existing) {
    // Update existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('resume_summary') as any)
      .update({ ...summary, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Insert new
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('resume_summary') as any)
      .insert({ ...summary, user_id: user.id })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/resume')
  revalidatePath('/app/settings')
  return { success: true }
}

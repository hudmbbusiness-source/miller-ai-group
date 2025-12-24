'use server'

import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { revalidatePath } from 'next/cache'

export interface Accomplishment {
  id: string
  user_id: string
  title: string
  description: string | null
  category: 'achievement' | 'press' | 'award' | 'publication'
  date: string | null
  link: string | null
  attachment_url: string | null
  visible: boolean
  order_index: number
  created_at: string
  updated_at: string
}

/**
 * Get all visible accomplishments (public)
 */
export async function getPublicAccomplishments(): Promise<Accomplishment[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('accomplishments') as any)
    .select('*')
    .eq('visible', true)
    .order('date', { ascending: false })

  return (data || []) as Accomplishment[]
}

/**
 * Get all accomplishments for owner (including hidden)
 */
export async function getAllAccomplishments(): Promise<Accomplishment[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('accomplishments') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('order_index')

  return (data || []) as Accomplishment[]
}

/**
 * Create an accomplishment (owner only)
 */
export async function createAccomplishment(item: {
  title: string
  description?: string
  category: Accomplishment['category']
  date?: string
  link?: string
}): Promise<{ success: boolean; error?: string; item?: Accomplishment }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can add accomplishments' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get next order index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('accomplishments') as any)
    .select('order_index')
    .eq('user_id', user.id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = existing?.[0]?.order_index ?? -1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('accomplishments') as any)
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

  revalidatePath('/accomplishments')
  revalidatePath('/app/settings')
  return { success: true, item: data as Accomplishment }
}

/**
 * Update an accomplishment (owner only)
 */
export async function updateAccomplishment(
  id: string,
  updates: Partial<Omit<Accomplishment, 'id' | 'user_id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can update accomplishments' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('accomplishments') as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/accomplishments')
  revalidatePath('/app/settings')
  return { success: true }
}

/**
 * Delete an accomplishment (owner only)
 */
export async function deleteAccomplishment(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can delete accomplishments' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('accomplishments') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/accomplishments')
  revalidatePath('/app/settings')
  return { success: true }
}

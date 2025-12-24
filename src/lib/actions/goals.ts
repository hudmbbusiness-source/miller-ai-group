'use server'

import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { revalidatePath } from 'next/cache'

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  category: 'short_term' | 'long_term' | 'milestone'
  status: 'active' | 'completed' | 'paused' | 'abandoned'
  target_date: string | null
  completed_date: string | null
  priority: number // 0=low, 1=medium, 2=high
  order_index: number
  created_at: string
  updated_at: string
}

/**
 * Get all goals (owner only - goals are private)
 */
export async function getGoals(): Promise<Goal[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('goals') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('order_index')

  return (data || []) as Goal[]
}

/**
 * Get active goals (owner only)
 */
export async function getActiveGoals(): Promise<Goal[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('goals') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('priority', { ascending: false })
    .order('order_index')

  return (data || []) as Goal[]
}

/**
 * Create a goal (owner only)
 */
export async function createGoal(item: {
  title: string
  description?: string
  category?: Goal['category']
  target_date?: string
  priority?: number
}): Promise<{ success: boolean; error?: string; item?: Goal }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can add goals' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get next order index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('goals') as any)
    .select('order_index')
    .eq('user_id', user.id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = existing?.[0]?.order_index ?? -1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('goals') as any)
    .insert({
      ...item,
      category: item.category || 'short_term',
      priority: item.priority ?? 1,
      user_id: user.id,
      order_index: nextOrder + 1,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app')
  revalidatePath('/app/goals')
  return { success: true, item: data as Goal }
}

/**
 * Update a goal (owner only)
 */
export async function updateGoal(
  id: string,
  updates: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can update goals' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // If marking as completed, set completed_date
  const finalUpdates = { ...updates, updated_at: new Date().toISOString() }
  if (updates.status === 'completed' && !updates.completed_date) {
    finalUpdates.completed_date = new Date().toISOString().split('T')[0]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update(finalUpdates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app')
  revalidatePath('/app/goals')
  return { success: true }
}

/**
 * Delete a goal (owner only)
 */
export async function deleteGoal(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can delete goals' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app')
  revalidatePath('/app/goals')
  return { success: true }
}

/**
 * Complete a goal (owner only)
 */
export async function completeGoal(id: string): Promise<{ success: boolean; error?: string }> {
  return updateGoal(id, { status: 'completed' })
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { revalidatePath } from 'next/cache'

export interface Asset {
  id: string
  user_id: string
  name: string
  description: string | null
  image_url: string | null
  external_link: string | null
  category: 'want' | 'owned' | 'goal'
  priority: number // 0=low, 1=medium, 2=high
  notes: string | null
  order_index: number
  created_at: string
  updated_at: string
}

/**
 * Get all assets (owner only - assets are private)
 */
export async function getAssets(): Promise<Asset[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('assets') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('order_index')

  return (data || []) as Asset[]
}

/**
 * Get assets by category (owner only)
 */
export async function getAssetsByCategory(category: Asset['category']): Promise<Asset[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('assets') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('category', category)
    .order('priority', { ascending: false })
    .order('order_index')

  return (data || []) as Asset[]
}

/**
 * Create an asset (owner only)
 */
export async function createAsset(item: {
  name: string
  description?: string
  image_url?: string
  external_link?: string
  category?: Asset['category']
  priority?: number
  notes?: string
}): Promise<{ success: boolean; error?: string; item?: Asset }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can add assets' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get next order index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('assets') as any)
    .select('order_index')
    .eq('user_id', user.id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = existing?.[0]?.order_index ?? -1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('assets') as any)
    .insert({
      ...item,
      category: item.category || 'want',
      priority: item.priority ?? 1,
      user_id: user.id,
      order_index: nextOrder + 1,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app')
  revalidatePath('/app/assets')
  return { success: true, item: data as Asset }
}

/**
 * Update an asset (owner only)
 */
export async function updateAsset(
  id: string,
  updates: Partial<Omit<Asset, 'id' | 'user_id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can update assets' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('assets') as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app')
  revalidatePath('/app/assets')
  return { success: true }
}

/**
 * Delete an asset (owner only)
 */
export async function deleteAsset(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can delete assets' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('assets') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app')
  revalidatePath('/app/assets')
  return { success: true }
}

/**
 * Move asset to owned (owner only)
 */
export async function markAssetOwned(id: string): Promise<{ success: boolean; error?: string }> {
  return updateAsset(id, { category: 'owned' })
}

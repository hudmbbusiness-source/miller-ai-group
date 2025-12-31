'use server'

import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { revalidatePath } from 'next/cache'
import type { Tables, InsertTables, UpdateTables } from '@/types/database'

export type MediaAsset = Tables<'media_assets'>
export type MediaCategory = Tables<'media_categories'>
export type InsertMediaAsset = InsertTables<'media_assets'>
export type UpdateMediaAsset = UpdateTables<'media_assets'>
export type InsertMediaCategory = InsertTables<'media_categories'>
export type UpdateMediaCategory = UpdateTables<'media_categories'>

export type MediaFileType = 'image' | 'video' | 'audio' | 'document' | 'animation' | 'svg' | 'other'

// MIME type to file type mapping
const MIME_TYPE_MAP: Record<string, MediaFileType> = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/avif': 'image',
  'image/gif': 'animation',
  'image/svg+xml': 'svg',
  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'audio/aac': 'audio',
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  // Animations (Lottie)
  'application/json': 'animation',
}

// Helper function - must be async for Server Actions
export async function getFileType(mimeType: string): Promise<MediaFileType> {
  return MIME_TYPE_MAP[mimeType] || 'other'
}

// Get all media assets with optional filters
export async function getMediaAssets(filters?: {
  file_type?: MediaFileType
  category_id?: string
  tags?: string[]
  search?: string
  favorites_only?: boolean
  limit?: number
  offset?: number
}): Promise<{ assets: MediaAsset[]; total: number }> {
  const owner = await isOwner()
  if (!owner) return { assets: [], total: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { assets: [], total: 0 }

  let query = supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filters?.file_type) {
    query = query.eq('file_type', filters.file_type)
  }

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters?.favorites_only) {
    query = query.eq('is_favorite', true)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching media assets:', error)
    return { assets: [], total: 0 }
  }

  return { assets: (data || []) as MediaAsset[], total: count || 0 }
}

// Get a single media asset by ID
export async function getMediaAsset(id: string): Promise<MediaAsset | null> {
  const owner = await isOwner()
  if (!owner) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching media asset:', error)
    return null
  }

  return data as MediaAsset
}

// Create a new media asset (metadata only - file upload handled separately)
export async function createMediaAsset(
  asset: Omit<InsertMediaAsset, 'user_id'>
): Promise<{ success: boolean; asset?: MediaAsset; error?: string }> {
  const owner = await isOwner()
  if (!owner) return { success: false, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .insert({
      ...asset,
      user_id: user.id,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    console.error('Error creating media asset:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true, asset: data as MediaAsset }
}

// Update a media asset
export async function updateMediaAsset(
  id: string,
  updates: UpdateMediaAsset
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) return { success: false, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating media asset:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true }
}

// Delete a media asset (including storage file)
export async function deleteMediaAsset(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) return { success: false, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // First get the asset to find the storage path
  const { data: asset, error: fetchError } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .select('storage_path, storage_bucket')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const assetData = asset as { storage_path: string; storage_bucket: string } | null

  if (fetchError || !assetData) {
    console.error('Error fetching media asset for deletion:', fetchError)
    return { success: false, error: 'Asset not found' }
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(assetData.storage_bucket)
    .remove([assetData.storage_path])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
    // Continue to delete the database record even if storage deletion fails
  }

  // Delete from database
  const { error: deleteError } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Error deleting media asset:', deleteError)
    return { success: false, error: deleteError.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true }
}

// Bulk delete media assets
export async function bulkDeleteMediaAssets(ids: string[]): Promise<{
  success: boolean
  deleted: number
  error?: string
}> {
  const owner = await isOwner()
  if (!owner) return { success: false, deleted: 0, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, deleted: 0, error: 'Not authenticated' }

  // Get all assets to find their storage paths
  const { data: assets, error: fetchError } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .select('id, storage_path, storage_bucket')
    .in('id', ids)
    .eq('user_id', user.id)

  const assetsData = assets as { id: string; storage_path: string; storage_bucket: string }[] | null

  if (fetchError) {
    console.error('Error fetching media assets for bulk deletion:', fetchError)
    return { success: false, deleted: 0, error: fetchError.message }
  }

  // Delete from storage (grouped by bucket)
  const bucketPaths: Record<string, string[]> = {}
  for (const asset of assetsData || []) {
    if (!bucketPaths[asset.storage_bucket]) {
      bucketPaths[asset.storage_bucket] = []
    }
    bucketPaths[asset.storage_bucket].push(asset.storage_path)
  }

  for (const [bucket, paths] of Object.entries(bucketPaths)) {
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove(paths)
    if (storageError) {
      console.error(`Error deleting files from ${bucket}:`, storageError)
    }
  }

  // Delete from database
  const { error: deleteError } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .delete()
    .in('id', ids)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Error bulk deleting media assets:', deleteError)
    return { success: false, deleted: 0, error: deleteError.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true, deleted: assetsData?.length || 0 }
}

// Toggle favorite status
export async function toggleMediaFavorite(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) return { success: false, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get current favorite status
  const { data: asset, error: fetchError } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .select('is_favorite')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const assetData = asset as { is_favorite: boolean } | null

  if (fetchError || !assetData) {
    return { success: false, error: 'Asset not found' }
  }

  // Toggle it
  const { error: updateError } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .update({ is_favorite: !assetData.is_favorite } as Record<string, unknown>)
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true }
}

// ============ CATEGORY OPERATIONS ============

// Get all categories
export async function getMediaCategories(): Promise<MediaCategory[]> {
  const owner = await isOwner()
  if (!owner) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('media_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('order_index')

  if (error) {
    console.error('Error fetching media categories:', error)
    return []
  }

  return (data || []) as MediaCategory[]
}

// Create a category
export async function createMediaCategory(
  category: Omit<InsertMediaCategory, 'user_id'>
): Promise<{ success: boolean; category?: MediaCategory; error?: string }> {
  const owner = await isOwner()
  if (!owner) return { success: false, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await (supabase
    .from('media_categories') as ReturnType<typeof supabase.from>)
    .insert({
      ...category,
      user_id: user.id,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    console.error('Error creating media category:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true, category: data as MediaCategory }
}

// Update a category
export async function updateMediaCategory(
  id: string,
  updates: UpdateMediaCategory
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) return { success: false, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await (supabase
    .from('media_categories') as ReturnType<typeof supabase.from>)
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating media category:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true }
}

// Delete a category
export async function deleteMediaCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) return { success: false, error: 'Owner access required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await (supabase
    .from('media_categories') as ReturnType<typeof supabase.from>)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting media category:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/app/admin/media')
  return { success: true }
}

// Create default categories for a new user
export async function ensureDefaultCategories(): Promise<void> {
  const owner = await isOwner()
  if (!owner) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Check if user has any categories
  const { data: existing } = await supabase
    .from('media_categories')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (existing && existing.length > 0) return

  // Create default categories
  const defaultCategories = [
    { name: 'Logos', slug: 'logos', color: '#6366f1', icon: 'image', order_index: 0 },
    { name: 'Icons', slug: 'icons', color: '#8b5cf6', icon: 'grid', order_index: 1 },
    { name: 'Backgrounds', slug: 'backgrounds', color: '#06b6d4', icon: 'image', order_index: 2 },
    { name: 'Videos', slug: 'videos', color: '#f43f5e', icon: 'video', order_index: 3 },
    { name: 'Audio', slug: 'audio', color: '#f97316', icon: 'music', order_index: 4 },
    { name: 'Documents', slug: 'documents', color: '#22c55e', icon: 'file', order_index: 5 },
    { name: 'Animations', slug: 'animations', color: '#eab308', icon: 'sparkles', order_index: 6 },
  ]

  await (supabase
    .from('media_categories') as ReturnType<typeof supabase.from>)
    .insert(defaultCategories.map(cat => ({ ...cat, user_id: user.id })) as Record<string, unknown>[])
}

// Get asset counts by file type
export async function getMediaAssetCounts(): Promise<Record<MediaFileType | 'all', number>> {
  const owner = await isOwner()
  if (!owner) return { all: 0, image: 0, video: 0, audio: 0, document: 0, animation: 0, svg: 0, other: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { all: 0, image: 0, video: 0, audio: 0, document: 0, animation: 0, svg: 0, other: 0 }

  const { data, error } = await (supabase
    .from('media_assets') as ReturnType<typeof supabase.from>)
    .select('file_type')
    .eq('user_id', user.id)

  const typedData = data as { file_type: string }[] | null

  if (error || !typedData) {
    return { all: 0, image: 0, video: 0, audio: 0, document: 0, animation: 0, svg: 0, other: 0 }
  }

  const counts: Record<MediaFileType | 'all', number> = {
    all: typedData.length,
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
    animation: 0,
    svg: 0,
    other: 0,
  }

  for (const asset of typedData) {
    const type = asset.file_type as MediaFileType
    if (counts[type] !== undefined) {
      counts[type]++
    }
  }

  return counts
}

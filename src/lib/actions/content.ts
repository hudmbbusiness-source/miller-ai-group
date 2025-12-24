'use server'

import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { revalidatePath } from 'next/cache'

/**
 * Get site content by key
 */
export async function getContent(key: string): Promise<string | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('site_content') as any)
    .select('value')
    .eq('key', key)
    .single()

  return data?.value || null
}

/**
 * Get multiple content items
 */
export async function getContentBatch(keys: string[]): Promise<Record<string, string>> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('site_content') as any)
    .select('key, value')
    .in('key', keys)

  const result: Record<string, string> = {}
  data?.forEach((item: { key: string; value: string }) => {
    result[item.key] = item.value
  })

  return result
}

/**
 * Update site content (owner only)
 */
export async function updateContent(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can update content' }
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('site_content') as any)
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Update multiple content items (owner only)
 */
export async function updateContentBatch(
  items: { key: string; value: string }[]
): Promise<{ success: boolean; error?: string }> {
  const owner = await isOwner()
  if (!owner) {
    return { success: false, error: 'Only the site owner can update content' }
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('site_content') as any)
    .upsert(items, { onConflict: 'key' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

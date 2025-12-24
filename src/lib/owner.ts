import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Check if the current user is the site owner
 */
export async function isOwner(): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase.from('site_settings') as any)
    .select('owner_user_id')
    .single()

  // If no settings exist yet, first user to check becomes owner
  if (!settings) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('site_settings') as any)
      .insert({ owner_user_id: user.id })

    if (!error) return true
  }

  return settings?.owner_user_id === user.id
}

/**
 * Get the owner user ID
 */
export async function getOwnerId(): Promise<string | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase.from('site_settings') as any)
    .select('owner_user_id')
    .single()

  return settings?.owner_user_id || null
}

/**
 * Require owner access - redirect to /app if not owner
 */
export async function requireOwner(): Promise<void> {
  const owner = await isOwner()
  if (!owner) {
    redirect('/app')
  }
}

/**
 * Get current user with owner status
 */
export async function getCurrentUserWithOwnerStatus() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isOwner: false }

  const owner = await isOwner()

  return { user, isOwner: owner }
}

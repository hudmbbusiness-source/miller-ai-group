import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HubLayout } from '@/components/hub/hub-layout'

export default async function PrivateHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <HubLayout user={user}>{children}</HubLayout>
}

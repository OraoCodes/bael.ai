import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AppRootPage() {
  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .limit(1)

  if (memberships?.[0]?.workspace_id) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('slug')
      .eq('id', memberships[0].workspace_id)
      .is('deleted_at', null)
      .single()
    if (ws?.slug) redirect(`/w/${ws.slug}`)
  }

  redirect('/onboard')
}

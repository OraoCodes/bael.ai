'use client'

import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import type { WorkspaceRole } from '@/lib/types/database'

interface WorkspaceContextType {
  workspace: { id: string; name: string; slug: string; logo_url: string | null }
  role: WorkspaceRole
  workspaceId: string
}

const WorkspaceContext = createContext<WorkspaceContextType>(null!)

export const useWorkspace = () => useContext(WorkspaceContext)

export function WorkspaceProvider({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const supabase = createClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspace', slug],
    queryFn: async () => {
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name, slug, logo_url')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single()

      if (wsError || !ws) throw new Error('Workspace not found')

      const { data: membership, error: memError } = await supabase
        .from('workspace_memberships')
        .select('role')
        .eq('workspace_id', ws.id)
        .eq('user_id', user!.id)
        .single()

      if (memError || !membership) throw new Error('Not a member of this workspace')

      return {
        workspace: ws,
        role: membership.role as WorkspaceRole,
      }
    },
    enabled: !!user,
  })

  if (isLoading) return <PageSpinner />

  if (error || !data) {
    return (
      <ResultView
        status="403"
        title="Workspace not found"
        subTitle="You don't have access to this workspace or it doesn't exist."
        className="min-h-screen"
      />
    )
  }

  return (
    <WorkspaceContext.Provider value={{ ...data, workspaceId: data.workspace.id }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

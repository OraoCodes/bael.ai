import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { WorkspaceSettings, Workspace } from '@/lib/types/database'

export const workspaceQueryKeys = {
  settings: (wsId: string) => ['workspace-settings', wsId] as const,
  detail: (wsId: string) => ['workspace-detail', wsId] as const,
}

export function useWorkspaceSettings() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: workspaceQueryKeys.settings(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single()
      if (error) throw error
      return data as WorkspaceSettings
    },
  })
}

export function useUpdateWorkspaceSettings() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: Partial<WorkspaceSettings>) => {
      const { data, error } = await supabase
        .from('workspace_settings')
        .update(values)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.settings(workspaceId) })
    },
  })
}

export function useUpdateWorkspace() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: Partial<Workspace>) => {
      const { data, error } = await supabase
        .from('workspaces')
        .update(values)
        .eq('id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
}

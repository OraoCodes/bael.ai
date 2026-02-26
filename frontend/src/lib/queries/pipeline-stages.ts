import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { PipelineStage } from '@/lib/types/database'

export const stageKeys = {
  all: (wsId: string) => ['stages', wsId] as const,
  list: (wsId: string) => [...stageKeys.all(wsId), 'list'] as const,
}

export function useStages() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: stageKeys.list(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position')
      if (error) throw error
      return data as PipelineStage[]
    },
  })
}

export function useCreateStage() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: Partial<PipelineStage>) => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert({ ...values, workspace_id: workspaceId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageKeys.all(workspaceId) })
    },
  })
}

export function useUpdateStage() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<PipelineStage> & { id: string }) => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .update(values)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageKeys.all(workspaceId) })
    },
  })
}

export function useDeleteStage() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageKeys.all(workspaceId) })
    },
  })
}

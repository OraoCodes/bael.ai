import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { PipelineStage } from '@/lib/types/database'

export const stageKeys = {
  all: (wsId: string) => ['stages', wsId] as const,
  list: (wsId: string) => [...stageKeys.all(wsId), 'list'] as const,
  applicationCount: (wsId: string, stageId: string) =>
    [...stageKeys.all(wsId), 'appCount', stageId] as const,
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

export function useStageApplicationCount(stageId: string | null) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: stageKeys.applicationCount(workspaceId, stageId || ''),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('candidate_applications')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('stage_id', stageId!)
        .is('deleted_at', null)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!stageId,
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

export function useReorderStages() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderedStages: { id: string; position: number }[]) => {
      // Update positions one by one — use a temporary high position to avoid unique constraint conflicts
      // First, shift all to high positions to avoid conflicts
      const tempOffset = 1000
      for (const stage of orderedStages) {
        const { error } = await supabase
          .from('pipeline_stages')
          .update({ position: stage.position + tempOffset })
          .eq('id', stage.id)
          .eq('workspace_id', workspaceId)
        if (error) throw error
      }
      // Then set final positions
      for (const stage of orderedStages) {
        const { error } = await supabase
          .from('pipeline_stages')
          .update({ position: stage.position })
          .eq('id', stage.id)
          .eq('workspace_id', workspaceId)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageKeys.all(workspaceId) })
    },
  })
}

export function useDeleteStageWithMigration() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ stageId, migrateToStageId }: { stageId: string; migrateToStageId: string }) => {
      // Move all applications from the deleted stage to the target stage
      const { error: migrateError } = await supabase
        .from('candidate_applications')
        .update({ stage_id: migrateToStageId, stage_entered_at: new Date().toISOString() })
        .eq('stage_id', stageId)
        .eq('workspace_id', workspaceId)
      if (migrateError) throw migrateError

      // Now delete the stage
      const { error: deleteError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId)
        .eq('workspace_id', workspaceId)
      if (deleteError) throw deleteError
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { ScheduledAction, ScheduledActionStatus, ScheduledActionType } from '@/lib/types/database'

export const actionKeys = {
  all: (wsId: string) => ['actions', wsId] as const,
  list: (wsId: string, filters: Record<string, unknown>) =>
    [...actionKeys.all(wsId), 'list', filters] as const,
}

export function useScheduledActions(filters: {
  status?: ScheduledActionStatus
  actionType?: ScheduledActionType
  assignedTo?: string
  page?: number
  pageSize?: number
}) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return useQuery({
    queryKey: actionKeys.list(workspaceId, filters),
    queryFn: async () => {
      let query = supabase
        .from('scheduled_actions')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .order('due_at', { ascending: true })
        .range(from, to)

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.actionType) query = query.eq('action_type', filters.actionType)
      if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)

      const { data, count, error } = await query
      if (error) throw error
      return { data: data as ScheduledAction[], total: count ?? 0 }
    },
  })
}

interface CreateActionInput {
  action_type: ScheduledActionType
  title: string
  description: string
  due_at: string
  entity_type: string | null
  entity_id: string | null
  assigned_to: string | null
  payload: Record<string, unknown>
}

export function useCreateScheduledAction() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CreateActionInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('scheduled_actions')
        .insert({ ...values, workspace_id: workspaceId, created_by: user!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionKeys.all(workspaceId) })
    },
  })
}

export function useCancelScheduledAction() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_actions')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionKeys.all(workspaceId) })
    },
  })
}

export function useCompleteScheduledAction() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_actions')
        .update({ status: 'completed', executed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionKeys.all(workspaceId) })
    },
  })
}

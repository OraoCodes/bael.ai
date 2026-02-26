import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Candidate } from '@/lib/types/database'

export const candidateKeys = {
  all: (wsId: string) => ['candidates', wsId] as const,
  list: (wsId: string, filters: Record<string, unknown>) =>
    [...candidateKeys.all(wsId), 'list', filters] as const,
  detail: (wsId: string, id: string) =>
    [...candidateKeys.all(wsId), 'detail', id] as const,
}

export function useCandidates(filters: {
  search?: string
  tags?: string[]
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
    queryKey: candidateKeys.list(workspaceId, filters),
    queryFn: async () => {
      let query = supabase
        .from('candidates')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        )
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      const { data, count, error } = await query
      if (error) throw error
      return { data: data as Candidate[], total: count ?? 0 }
    },
  })
}

export function useCandidate(id: string) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: candidateKeys.detail(workspaceId, id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .single()
      if (error) throw error
      return data as Candidate
    },
    enabled: !!id,
  })
}

export function useCreateCandidate() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: Partial<Candidate>) => {
      const { data, error } = await supabase
        .from('candidates')
        .insert({ ...values, workspace_id: workspaceId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all(workspaceId) })
    },
  })
}

export function useUpdateCandidate() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await supabase
        .from('candidates')
        .update(values)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all(workspaceId) })
      queryClient.setQueryData(candidateKeys.detail(workspaceId, data.id), data)
    },
  })
}

export function useDeleteCandidate() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('candidates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all(workspaceId) })
    },
  })
}

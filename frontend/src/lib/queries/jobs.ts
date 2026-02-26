import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Job, JobStatus } from '@/lib/types/database'

export interface AiGeneratedJob {
  title: string
  description?: string
  department?: string | null
  employment_type?: string | null
  seniority_level?: string | null
  workplace_type?: string | null
  job_function?: string | null
  skills?: string[]
}

export const jobKeys = {
  all: (wsId: string) => ['jobs', wsId] as const,
  list: (wsId: string, filters: Record<string, unknown>) =>
    [...jobKeys.all(wsId), 'list', filters] as const,
  detail: (wsId: string, id: string) =>
    [...jobKeys.all(wsId), 'detail', id] as const,
}

export function useJobs(filters: {
  status?: JobStatus
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
    queryKey: jobKeys.list(workspaceId, filters),
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      const { data, count, error } = await query
      if (error) throw error
      return { data: data as Job[], total: count ?? 0 }
    },
  })
}

export function useJob(id: string) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: jobKeys.detail(workspaceId, id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .single()
      if (error) throw error
      return data as Job
    },
    enabled: !!id,
  })
}

export function useCreateJob() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: Partial<Job>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('jobs')
        .insert({ ...values, workspace_id: workspaceId, created_by: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all(workspaceId) })
    },
  })
}

export function useUpdateJob() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Job> & { id: string }) => {
      const { data, error } = await supabase
        .from('jobs')
        .update(values)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all(workspaceId) })
      queryClient.setQueryData(jobKeys.detail(workspaceId, data.id), data)
    },
  })
}

export function useGenerateJob() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (prompt: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-generate-job`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ workspace_id: workspaceId, prompt }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Generation failed')
      }
      return res.json() as Promise<AiGeneratedJob>
    },
  })
}

export type OpenJobRow = {
  id: string
  title: string
  department: string | null
  job_function: string | null
  created_at: string
  candidate_applications: { count: number }[]
}

export const OPEN_JOBS_PAGE_SIZE = 5

export function useOpenJobs(page = 0) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const from = page * OPEN_JOBS_PAGE_SIZE
  const to = from + OPEN_JOBS_PAGE_SIZE - 1

  return useQuery({
    queryKey: jobKeys.list(workspaceId, { status: 'open', widget: true, page }),
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('jobs')
        .select('id, title, department, job_function, created_at, candidate_applications!job_id(count)', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('status', 'open')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return { data: data as unknown as OpenJobRow[], total: count ?? 0 }
    },
  })
}

export function useExtractJobFromPdf() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspace_id', workspaceId)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-extract-job-pdf`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            // No Content-Type header — browser sets multipart/form-data with boundary automatically
          },
          body: formData,
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Extraction failed')
      }
      return res.json() as Promise<AiGeneratedJob>
    },
  })
}

export function useDeleteJob() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('jobs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all(workspaceId) })
    },
  })
}

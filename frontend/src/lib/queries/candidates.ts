import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Candidate, CandidateAiProfile } from '@/lib/types/database'

export interface AiParsedResume {
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  skills: string[]
  experience: Array<{ title: string; company: string; location: string | null; start_date: string | null; end_date: string | null }>
  education: Array<{ degree: string; field: string | null; institution: string; year: number | null }>
  certifications: Array<{ name: string; issuer: string | null }>
  total_years_experience: number | null
  languages: string[]
  location: string | null
  summary: string
  resume_text: string
}

export interface CandidateSearchResult {
  candidate_id: string
  first_name: string
  last_name: string
  email: string | null
  ai_summary: string | null
  ai_profile: CandidateAiProfile | null
  similarity: number
  relevance_score: number
  rank: number
  explanation: string
}

export interface CandidateSearchResponse {
  results: CandidateSearchResult[]
  query_interpretation: {
    hard_filters: Record<string, unknown>
    semantic_query: string
    explanation: string
  }
  total_candidates_searched: number
}

export const candidateKeys = {
  all: (wsId: string) => ['candidates', wsId] as const,
  list: (wsId: string, filters: Record<string, unknown>) =>
    [...candidateKeys.all(wsId), 'list', filters] as const,
  detail: (wsId: string, id: string) =>
    [...candidateKeys.all(wsId), 'detail', id] as const,
}

export const searchKeys = {
  all: (wsId: string) => ['candidate-search', wsId] as const,
  query: (wsId: string, query: string) =>
    [...searchKeys.all(wsId), query] as const,
}

const SENIORITY_RANGES: Record<string, [number, number]> = {
  junior: [0, 2],
  'mid-level': [3, 5],
  senior: [6, 9],
  staff: [10, 14],
  principal: [15, 99],
}

export function useCandidates(filters: {
  search?: string
  tags?: string[]
  source?: string
  seniority?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const sortBy = filters.sortBy ?? 'created_at'
  const sortDir = filters.sortDir ?? 'desc'

  return useQuery({
    queryKey: candidateKeys.list(workspaceId, filters),
    queryFn: async () => {
      let query = supabase
        .from('candidates')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(from, to)

      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        )
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }
      if (filters.source) {
        query = query.eq('source', filters.source)
      }
      if (filters.seniority) {
        const range = SENIORITY_RANGES[filters.seniority.toLowerCase()]
        if (range) {
          query = query
            .gte('ai_profile->>total_years_experience', range[0])
            .lte('ai_profile->>total_years_experience', range[1])
        }
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('candidates')
        .insert({ ...values, workspace_id: workspaceId, created_by: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Candidate
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

export function useParseResume() {
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
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-parse-resume`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Resume parsing failed')
      }
      return res.json() as Promise<AiParsedResume>
    },
  })
}

export function useUploadResume() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ candidateId, file }: { candidateId: string; file: File }) => {
      const path = `${workspaceId}/${candidateId}/${file.name}`
      const { error } = await supabase.storage.from('resumes').upload(path, file, {
        upsert: true,
        contentType: 'application/pdf',
      })
      if (error) throw error
      return path
    },
  })
}

export function useEmbedCandidate() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (candidateId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-embed-candidate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workspace_id: workspaceId, candidate_id: candidateId }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Embedding failed')
      }
      return res.json()
    },
  })
}

export function useSearchCandidates() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (query: string): Promise<CandidateSearchResponse> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-search-candidates`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workspace_id: workspaceId, query }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Search failed')
      }
      return res.json()
    },
  })
}

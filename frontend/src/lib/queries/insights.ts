import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'

export const insightKeys = {
  all: (wsId: string) => ['insights', wsId] as const,
  suggestions: (wsId: string) => [...insightKeys.all(wsId), 'suggestions'] as const,
}

export interface InsightJob {
  id: string
  title: string
  department: string | null
  job_function: string | null
  suggestions: Array<{
    id: string
    score: number
    reasoning: string
    computed_at: string
    candidate: {
      id: string
      first_name: string
      last_name: string
      tags: string[]
    }
  }>
}

export function useAiInsights() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: insightKeys.suggestions(workspaceId),
    queryFn: async () => {
      // Fetch open jobs
      const { data: openJobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('id, title, department, job_function')
        .eq('workspace_id', workspaceId)
        .eq('status', 'open')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(2)

      if (jobsErr) throw jobsErr
      if (!openJobs || openJobs.length === 0) return []

      const jobIds = openJobs.map((j) => j.id)

      // Fetch active suggestions for these jobs
      const { data: suggestions, error: sugErr } = await supabase
        .from('ai_job_suggestions')
        .select(
          `id, job_id, score, reasoning, computed_at, candidate_id,
           candidates!inner ( id, first_name, last_name, tags )`
        )
        .eq('workspace_id', workspaceId)
        .in('job_id', jobIds)
        .is('dismissed_at', null)
        .order('score', { ascending: false })

      if (sugErr) throw sugErr

      // Group by job, limit to top 3 per job
      const jobMap = new Map<string, InsightJob>(
        openJobs.map((j) => [
          j.id,
          {
            ...j,
            suggestions: [] as InsightJob['suggestions'],
          },
        ])
      )

      for (const s of suggestions || []) {
        const job = jobMap.get(s.job_id)
        if (job && job.suggestions.length < 3) {
          const c = s.candidates as unknown as {
            id: string
            first_name: string
            last_name: string
            tags: string[]
          }
          job.suggestions.push({
            id: s.id,
            score: Number(s.score),
            reasoning: s.reasoning,
            computed_at: s.computed_at,
            candidate: c,
          })
        }
      }

      // Return only jobs that have suggestions
      return Array.from(jobMap.values()).filter((j) => j.suggestions.length > 0)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useRefreshInsights() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (forceRefresh: boolean = true) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-insights`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            force_refresh: forceRefresh,
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to generate insights')
      }
      return res.json() as Promise<{
        jobs_processed: number
        suggestions_created: number
      }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all(workspaceId) })
    },
  })
}

export function useDismissSuggestion() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('ai_job_suggestions')
        .update({
          dismissed_at: new Date().toISOString(),
          dismissed_by: user.id,
        })
        .eq('id', suggestionId)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    },
    onMutate: async (suggestionId) => {
      await queryClient.cancelQueries({
        queryKey: insightKeys.suggestions(workspaceId),
      })
      const prev = queryClient.getQueryData<InsightJob[]>(
        insightKeys.suggestions(workspaceId)
      )

      queryClient.setQueryData<InsightJob[]>(
        insightKeys.suggestions(workspaceId),
        (old) =>
          (old || [])
            .map((job) => ({
              ...job,
              suggestions: job.suggestions.filter((s) => s.id !== suggestionId),
            }))
            .filter((job) => job.suggestions.length > 0)
      )

      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(
          insightKeys.suggestions(workspaceId),
          context.prev
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: insightKeys.suggestions(workspaceId),
      })
    },
  })
}

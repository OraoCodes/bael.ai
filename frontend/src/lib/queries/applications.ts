import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { CandidateApplication, CandidateApplicationWithDetails, ApplicationAnswer } from '@/lib/types/database'

export const applicationKeys = {
  all: (wsId: string) => ['applications', wsId] as const,
  byJob: (wsId: string, jobId: string) => [...applicationKeys.all(wsId), 'job', jobId] as const,
  byCandidate: (wsId: string, candidateId: string) =>
    [...applicationKeys.all(wsId), 'candidate', candidateId] as const,
  detail: (wsId: string, id: string) => [...applicationKeys.all(wsId), 'detail', id] as const,
  answers: (wsId: string, applicationId: string) =>
    [...applicationKeys.all(wsId), 'answers', applicationId] as const,
  upcomingInterviews: (wsId: string) => [...applicationKeys.all(wsId), 'upcoming-interviews'] as const,
}

export function useApplicationsByJob(jobId: string) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: applicationKeys.byJob(workspaceId, jobId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_applications')
        .select('*, candidates(*), pipeline_stages(*)')
        .eq('workspace_id', workspaceId)
        .eq('job_id', jobId)
        .is('deleted_at', null)
        .order('applied_at', { ascending: false })
      if (error) throw error
      return data as CandidateApplicationWithDetails[]
    },
    enabled: !!jobId,
  })
}

export function useApplicationsByCandidate(candidateId: string) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: applicationKeys.byCandidate(workspaceId, candidateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_applications')
        .select('*, pipeline_stages(*), jobs(id, title, status), candidates(resume_url)')
        .eq('workspace_id', workspaceId)
        .eq('candidate_id', candidateId)
        .is('deleted_at', null)
        .order('applied_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!candidateId,
  })
}

export function useApplicationAnswers(applicationId: string | null) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: applicationKeys.answers(workspaceId, applicationId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_answers')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('application_id', applicationId!)
        .order('created_at')
      if (error) throw error
      return data as ApplicationAnswer[]
    },
    enabled: !!applicationId,
  })
}

export function useMoveApplication() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      applicationId,
      newStageId,
      jobId,
      rejectionReason,
    }: {
      applicationId: string
      newStageId: string
      jobId: string
      rejectionReason?: string
    }) => {
      const update: Record<string, unknown> = { stage_id: newStageId }
      if (rejectionReason !== undefined) update.rejection_reason = rejectionReason

      const { data, error } = await supabase
        .from('candidate_applications')
        .update(update)
        .eq('id', applicationId)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return { data, jobId }
    },
    onMutate: async ({ applicationId, newStageId, jobId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: applicationKeys.byJob(workspaceId, jobId) })
      const previous = queryClient.getQueryData(applicationKeys.byJob(workspaceId, jobId))
      queryClient.setQueryData(
        applicationKeys.byJob(workspaceId, jobId),
        (old: CandidateApplicationWithDetails[] | undefined) =>
          old?.map((app) =>
            app.id === applicationId
              ? { ...app, stage_id: newStageId }
              : app
          )
      )
      return { previous, jobId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.jobId) {
        queryClient.setQueryData(
          applicationKeys.byJob(workspaceId, context.jobId),
          context.previous
        )
      }
    },
    onSettled: (_data, _err, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.byJob(workspaceId, jobId) })
    },
  })
}

export function useUpdateApplicationRating() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      rating,
      jobId,
    }: {
      id: string
      rating: number | null
      jobId: string
    }) => {
      const { data, error } = await supabase
        .from('candidate_applications')
        .update({ rating })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return { data, jobId }
    },
    onSuccess: ({ jobId }) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.byJob(workspaceId, jobId) })
    },
  })
}

export function useCreateApplication() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      candidate_id: string
      job_id: string
      stage_id: string
      assigned_to?: string
    }) => {
      const { data, error } = await supabase
        .from('candidate_applications')
        .insert({ ...values, workspace_id: workspaceId })
        .select()
        .single()
      if (error) throw error
      return data as CandidateApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: applicationKeys.byJob(workspaceId, data.job_id),
      })
      queryClient.invalidateQueries({
        queryKey: applicationKeys.byCandidate(workspaceId, data.candidate_id),
      })
    },
  })
}

export function useUpdateInterviewDetails() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      interview_type,
      interview_date,
      interview_time,
      interview_location,
      interview_link,
      jobId,
    }: {
      id: string
      interview_type: 'in_person' | 'online'
      interview_date: string
      interview_time: string
      interview_location: string
      interview_link: string | null
      jobId: string
    }) => {
      const { data, error } = await supabase
        .from('candidate_applications')
        .update({ interview_type, interview_date, interview_time, interview_location, interview_link })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      if (error) throw error
      return { data, jobId }
    },
    onSuccess: ({ jobId }) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.byJob(workspaceId, jobId) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.upcomingInterviews(workspaceId) })
    },
  })
}

export function useUpcomingInterviews() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: applicationKeys.upcomingInterviews(workspaceId),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('candidate_applications')
        .select('id, interview_type, interview_date, interview_time, interview_location, interview_link, candidates(first_name, last_name), jobs(title)')
        .eq('workspace_id', workspaceId)
        .gte('interview_date', today)
        .is('deleted_at', null)
        .order('interview_date', { ascending: true })
        .order('interview_time', { ascending: true })
        .limit(60)
      if (error) throw error
      return (data as unknown as Array<{
        id: string
        interview_type: 'in_person' | 'online' | null
        interview_date: string
        interview_time: string
        interview_location: string | null
        interview_link: string | null
        candidates: { first_name: string; last_name: string }
        jobs: { title: string }
      }>)
    },
  })
}

export function useAiMatch() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-match-candidates', {
        body: { job_id: jobId, workspace_id: workspaceId },
      })
      if (error) throw error
      return data.scores as { application_id: string; score: number; reasoning: string }[]
    },
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.byJob(workspaceId, jobId) })
    },
  })
}

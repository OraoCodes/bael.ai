import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { RecruiterMetric } from '@/lib/types/database'

export const metricsKeys = {
  all: (wsId: string) => ['metrics', wsId] as const,
  recruiterMetrics: (wsId: string) => [...metricsKeys.all(wsId), 'recruiters'] as const,
  dashboardStats: (wsId: string) => [...metricsKeys.all(wsId), 'dashboard'] as const,
}

export function useRecruiterMetrics() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: metricsKeys.recruiterMetrics(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruiter_metrics')
        .select('*')
        .eq('workspace_id', workspaceId)
      if (error) throw error
      return data as RecruiterMetric[]
    },
  })
}

export function useDashboardStats() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: metricsKeys.dashboardStats(workspaceId),
    queryFn: async () => {
      const [jobsRes, appsRes, actionsRes, stagesRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('status', 'open')
          .is('deleted_at', null),
        supabase
          .from('candidate_applications')
          .select('id, stage_id')
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null),
        supabase
          .from('scheduled_actions')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('status', 'pending'),
        supabase
          .from('pipeline_stages')
          .select('id, name, color, is_terminal')
          .eq('workspace_id', workspaceId)
          .order('position'),
      ])

      const allApps = appsRes.data || []
      const stageList = stagesRes.data || []
      const terminalStageIds = new Set(
        (stageList as { id: string; is_terminal?: boolean }[])
          .filter((s) => s.is_terminal)
          .map((s) => s.id)
      )
      const activeApps = allApps.filter((a) => !terminalStageIds.has(a.stage_id))
      const hiredStage = stageList.find((s) => s.name.toLowerCase() === 'hired')
      const hiredCount = hiredStage
        ? allApps.filter((a) => a.stage_id === hiredStage.id).length
        : 0

      const appsByStage = (stagesRes.data || []).map((stage) => ({
        stageId: stage.id,
        stageName: stage.name,
        stageColor: stage.color,
        count: allApps.filter((a) => a.stage_id === stage.id).length,
      }))

      return {
        openJobs: jobsRes.count ?? 0,
        activeApplications: activeApps.length,
        hiredCount,
        pendingActions: actionsRes.count ?? 0,
        appsByStage,
      }
    },
  })
}


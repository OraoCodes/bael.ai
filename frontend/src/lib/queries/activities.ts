import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Activity } from '@/lib/types/database'

export type ActivityWithActor = Activity & {
  users: { full_name: string | null; email: string; avatar_url: string | null } | null
}

export const activityKeys = {
  all: (wsId: string) => ['activities', wsId] as const,
  feed: (wsId: string, filters: Record<string, unknown>) =>
    [...activityKeys.all(wsId), 'feed', filters] as const,
  entity: (wsId: string, entityType: string, entityId: string) =>
    [...activityKeys.all(wsId), 'entity', entityType, entityId] as const,
}

const PAGE_SIZE = 20
const ACTIVITY_SELECT = '*, users!actor_id(full_name, email, avatar_url)'

const CARD_PAGE_SIZE = 5

export function useRecentActivity(page: number) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const from = page * CARD_PAGE_SIZE
  const to = from + CARD_PAGE_SIZE - 1

  return useQuery({
    queryKey: [...activityKeys.all(workspaceId), 'card', page],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('activities')
        .select(ACTIVITY_SELECT, { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .not('entity_type', 'in', '("users","scheduled_actions")')
        .not('action', 'eq', 'executed')
        .or('actor_id.not.is.null,action.eq.applied')
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return { data: data as ActivityWithActor[], total: count ?? 0 }
    },
  })
}

export function useActivityFeed(filters: {
  entityType?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
}) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: activityKeys.feed(workspaceId, filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam as number
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('activities')
        .select(ACTIVITY_SELECT)
        .eq('workspace_id', workspaceId)
        .not('entity_type', 'in', '("users","scheduled_actions")')
        .not('action', 'eq', 'executed')
        .or('actor_id.not.is.null,action.eq.applied')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.entityType) query = query.eq('entity_type', filters.entityType)
      if (filters.actorId) query = query.eq('actor_id', filters.actorId)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo)

      const { data, error } = await query
      if (error) throw error
      return data as ActivityWithActor[]
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.flat().length : undefined,
  })
}

export function useEntityActivities(entityType: string, entityId: string) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: activityKeys.entity(workspaceId, entityType, entityId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam as number
      const to = from + PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('activities')
        .select(ACTIVITY_SELECT)
        .eq('workspace_id', workspaceId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return data as ActivityWithActor[]
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.flat().length : undefined,
    enabled: !!entityId,
  })
}

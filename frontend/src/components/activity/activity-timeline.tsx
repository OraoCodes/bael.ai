'use client'

import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Timeline } from '@/components/ui/timeline'
import { EmptyState } from '@/components/shared/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { useEntityActivities } from '@/lib/queries/activities'
import { formatRelative, getActivityLabel } from '@/lib/utils/format'
import type { Activity } from '@/lib/types/database'

interface ActivityTimelineProps {
  entityType: string
  entityId: string
}

function activityDotColor(action: string): string {
  const colors: Record<string, string> = {
    created: 'bg-green-500',
    deleted: 'bg-red-500',
    stage_changed: 'bg-blue-500',
    ai_match_scored: 'bg-purple-500',
  }
  return colors[action] || 'bg-gray-400'
}

function activityLabel(activity: Activity): string {
  const meta = activity.metadata as Record<string, unknown>
  if (activity.action === 'stage_changed') {
    return `Moved from "${meta.from_stage}" to "${meta.to_stage}"`
  }
  return `${getActivityLabel(activity.action)} this ${activity.entity_type.replace(/_/g, ' ')}`
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEntityActivities(entityType, entityId)

  const activities = data?.pages.flat() ?? []

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="py-10">
        <EmptyState description="No activity yet" />
      </div>
    )
  }

  const timelineItems = activities.map((activity) => ({
    key: activity.id,
    dot:
      activity.action === 'stage_changed' ? (
        <Clock className="h-3.5 w-3.5" />
      ) : (
        <span className={`block h-2.5 w-2.5 rounded-full ${activityDotColor(activity.action)}`} />
      ),
    children: (
      <div>
        <div className="text-[13px]">{activityLabel(activity)}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {formatRelative(activity.created_at)}
        </div>
      </div>
    ),
  }))

  return (
    <div>
      <Timeline items={timelineItems} />
      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="px-0 text-primary"
        >
          {isFetchingNextPage && (
            <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          Load more
        </Button>
      )}
    </div>
  )
}

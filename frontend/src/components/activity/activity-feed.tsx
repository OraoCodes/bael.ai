'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Timeline } from '@/components/ui/timeline'
import { EmptyState } from '@/components/shared/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { useActivityFeed } from '@/lib/queries/activities'
import { useMembers } from '@/lib/queries/team'
import { formatRelative, getActivityLabel } from '@/lib/utils/format'
import type { Activity } from '@/lib/types/database'

const ENTITY_TYPES = [
  { label: 'All', value: '' },
  { label: 'Candidates', value: 'candidates' },
  { label: 'Jobs', value: 'jobs' },
  { label: 'Applications', value: 'candidate_applications' },
  { label: 'Invitations', value: 'invitations' },
]

function activityDescription(activity: Activity): string {
  const meta = activity.metadata as Record<string, unknown>
  if (activity.action === 'stage_changed') {
    return `Moved from "${meta.from_stage}" to "${meta.to_stage}"`
  }
  if (activity.action === 'ai_match_scored') {
    return `Ran AI matching (${meta.candidates_scored} candidates scored)`
  }
  return `${getActivityLabel(activity.action)} ${activity.entity_type.replace(/_/g, ' ')}`
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

export function ActivityFeed() {
  const [entityType, setEntityType] = useState('')
  const [actorId, setActorId] = useState<string | undefined>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: membersData } = useMembers()

  const filters = {
    entityType: entityType || undefined,
    actorId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivityFeed(filters)

  const activities = data?.pages.flat() ?? []

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
        <div className="text-[13px]">{activityDescription(activity)}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {formatRelative(activity.created_at)}
        </div>
      </div>
    ),
  }))

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value === '' ? '__all__' : t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actorId ?? '__all__'}
          onValueChange={(v) => setActorId(v === '__all__' ? undefined : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actors</SelectItem>
            {(membersData || []).map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.users.full_name || m.users.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : activities.length === 0 ? (
        <div className="py-16">
          <EmptyState description="No activity found" />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}

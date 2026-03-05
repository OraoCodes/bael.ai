'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useRecentActivity, type ActivityWithActor } from '@/lib/queries/activities'
import { formatRelative } from '@/lib/utils/format'

const PAGE_SIZE = 5

type ChipStyle = { label: string; className: string }

const ACTION_CHIPS: Record<string, ChipStyle> = {
  ai_scored:              { label: 'AI Match',  className: 'bg-purple-100 text-purple-700' },
  applied:                { label: 'Applied',   className: 'bg-blue-100 text-blue-700' },
  stage_changed:          { label: 'Stage',     className: 'bg-amber-100 text-amber-700' },
  moved:                  { label: 'Stage',     className: 'bg-amber-100 text-amber-700' },
  member_joined:          { label: 'Joined',    className: 'bg-emerald-100 text-emerald-700' },
}

const AVATAR_BG: Record<string, string> = {
  ai_scored:     'bg-purple-100 text-purple-700',
  created:       'bg-emerald-100 text-emerald-700',
  updated:       'bg-blue-100 text-blue-700',
  moved:         'bg-amber-100 text-amber-700',
  deleted:       'bg-red-100 text-red-600',
  stage_changed: 'bg-amber-100 text-amber-700',
  applied:       'bg-blue-100 text-blue-700',
  joined:        'bg-emerald-100 text-emerald-700',
  member_joined: 'bg-emerald-100 text-emerald-700',
  left:          'bg-zinc-100 text-zinc-600',
  invited:       'bg-violet-100 text-violet-700',
}

function getActorInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return parts[0]?.[0]?.toUpperCase() || '?'
}

function getActivitySentence(activity: ActivityWithActor): string {
  const meta = activity.metadata as Record<string, unknown>
  const actor = activity.users?.full_name || activity.users?.email || 'Someone'

  const key = `${activity.entity_type}:${activity.action}`

  switch (key) {
    case 'workspace_memberships:created':
    case 'workspace_memberships:member_joined':
      return `${actor} joined the workspace`
    case 'workspace_memberships:deleted':
      return `${actor} left the workspace`
    case 'invitations:created':
    case 'invitations:invited':
      return `${actor} invited ${(meta.email as string) || 'someone'} to the workspace`
    case 'invitations:revoked':
      return `${actor} revoked the invitation for ${(meta.email as string) || 'a user'}`
    case 'candidates:created': {
      const name = `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || 'a candidate'
      return `${actor} added ${name} as a candidate`
    }
    case 'candidates:updated': {
      const name = `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || 'a candidate'
      return `${actor} updated ${name}`
    }
    case 'candidates:deleted': {
      const name = `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || 'a candidate'
      return `${actor} removed ${name}`
    }
    case 'jobs:created':
      return `${actor} posted a new job — ${(meta.title as string) || 'untitled'}`
    case 'jobs:updated':
      return `${actor} updated job — ${(meta.title as string) || 'a job'}`
    case 'jobs:deleted':
      return `${actor} removed job — ${(meta.title as string) || 'a job'}`
    case 'candidate_applications:stage_changed':
    case 'candidate_applications:moved':
      return `${actor} moved a candidate to a new stage`
    case 'candidate_applications:created':
      return `${actor} added a candidate to a pipeline`
    default:
      if (activity.action === 'applied') {
        const candidateName = (meta.candidate_name as string) || 'A candidate'
        const jobTitle = (meta.job_title as string) || 'a position'
        return `${candidateName} applied for ${jobTitle}`
      }
      return `${actor} ${activity.action.replace(/_/g, ' ')} ${activity.entity_type.replace(/_/g, ' ')}`
  }
}

export function RecentActivityCard() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useRecentActivity(page)

  const activities = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const showPagination = total > PAGE_SIZE

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 && page === 0 ? (
          <EmptyState description="No activity yet" />
        ) : (
          <>
            <div className="space-y-4">
              {activities.map((activity) => {
                const chip = ACTION_CHIPS[activity.action]
                const avatarBg = AVATAR_BG[activity.action] || 'bg-gray-100 text-gray-600'
                const actorName = activity.users?.full_name || activity.users?.email || 'Someone'
                const sentence = getActivitySentence(activity)
                const initials = getActorInitials(actorName)

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    {activity.users?.avatar_url ? (
                      <img
                        src={activity.users.avatar_url}
                        alt={actorName}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarBg}`}>
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs leading-snug text-muted-foreground">
                          {sentence}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelative(activity.created_at)}
                        </span>
                      </div>
                      {chip && (
                        <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.className}`}>
                          {chip.label}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {showPagination && (
              <div className="flex items-center justify-between pt-3 mt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] text-zinc-400 tabular-nums">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

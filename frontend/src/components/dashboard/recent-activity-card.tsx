'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useRecentActivity, type ActivityWithActor } from '@/lib/queries/activities'
import { formatRelative, getActivityLabel } from '@/lib/utils/format'

const PAGE_SIZE = 5

type ChipStyle = { label: string; className: string }

const ACTION_CHIPS: Record<string, ChipStyle> = {
  ai_scored:     { label: 'AI Match',  className: 'bg-purple-100 text-purple-700' },
  created:       { label: 'New',       className: 'bg-emerald-100 text-emerald-700' },
  updated:       { label: 'Updated',   className: 'bg-blue-100 text-blue-700' },
  moved:         { label: 'Moved',     className: 'bg-amber-100 text-amber-700' },
  deleted:       { label: 'Removed',   className: 'bg-red-100 text-red-600' },
  stage_changed: { label: 'Stage',     className: 'bg-amber-100 text-amber-700' },
}

const AVATAR_BG: Record<string, string> = {
  ai_scored:     'bg-purple-100 text-purple-700',
  created:       'bg-emerald-100 text-emerald-700',
  updated:       'bg-blue-100 text-blue-700',
  moved:         'bg-amber-100 text-amber-700',
  deleted:       'bg-red-100 text-red-600',
  stage_changed: 'bg-amber-100 text-amber-700',
}

function getActorInitials(fullName: string | null | undefined, email: string | undefined): string {
  const name = fullName || email || ''
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return parts[0]?.[0]?.toUpperCase() || '?'
}

function getActorLabel(activity: ActivityWithActor): string {
  const user = activity.users
  if (!user) return 'System'
  return user.full_name || user.email
}

function getEntityName(activity: ActivityWithActor): string {
  const meta = activity.metadata as Record<string, unknown>
  switch (activity.entity_type) {
    case 'jobs':
      return (meta.title as string) || 'a job'
    case 'candidates': {
      const first = (meta.first_name as string) || ''
      const last = (meta.last_name as string) || ''
      return `${first} ${last}`.trim() || 'a candidate'
    }
    case 'invitations':
      return (meta.email as string) || 'a user'
    case 'candidate_applications':
      return 'an application'
    default:
      return activity.entity_type.replace(/_/g, ' ')
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
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          The Pulse
        </CardTitle>
        <p className="text-base font-semibold text-foreground -mt-1">Recent Activity</p>
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
                const actorLabel = getActorLabel(activity)
                const entityName = getEntityName(activity)
                const initials = getActorInitials(activity.users?.full_name, activity.users?.email)

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    {activity.users?.avatar_url ? (
                      <img
                        src={activity.users.avatar_url}
                        alt={actorLabel}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarBg}`}>
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs leading-snug">
                          <span className="font-semibold">{actorLabel}</span>{' '}
                          <span className="text-muted-foreground">{getActivityLabel(activity.action)}</span>{' '}
                          <span className="font-medium text-foreground">{entityName}</span>
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

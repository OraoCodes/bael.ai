'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Video, MapPin, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useUpcomingInterviews } from '@/lib/queries/applications'
import { getPlatformConfig } from '@/components/pipeline/pipeline-card'
import { cn } from '@/lib/utils'

const BAR_COLORS = [
  'bg-violet-400',
  'bg-sky-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-fuchsia-400',
]

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function formatDayLabel(isoDate: string) {
  const d = new Date(isoDate + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

export function UpcomingInterviewsCard() {
  const { data: interviews, isLoading } = useUpcomingInterviews()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [activeMonth, setActiveMonth] = useState(now.getMonth())
  const stripRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)

  // Scroll active month into view on mount and when it changes
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeMonth, viewYear])

  // Which months have interviews
  const monthsWithInterviews = useMemo(() => {
    const set = new Set<string>()
    for (const i of (interviews ?? [])) {
      const d = new Date(i.interview_date + 'T00:00:00')
      set.add(`${d.getFullYear()}-${d.getMonth()}`)
    }
    return set
  }, [interviews])

  // Interviews for the selected month, sorted by date then time
  const filtered = useMemo(() =>
    (interviews ?? []).filter((i) => {
      const d = new Date(i.interview_date + 'T00:00:00')
      return d.getFullYear() === viewYear && d.getMonth() === activeMonth
    }),
    [interviews, viewYear, activeMonth]
  )

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-2">
          <Video className="h-4 w-4 text-violet-500" />
          Upcoming Interviews
        </CardTitle>

        {/* Month strip */}
        <div
          ref={stripRef}
          className="flex gap-0.5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {MONTH_LABELS.map((label, i) => {
            const isActive = i === activeMonth && viewYear === viewYear
            const hasDot = monthsWithInterviews.has(`${viewYear}-${i}`)
            const isCurrentMonth = i === now.getMonth() && viewYear === now.getFullYear()
            return (
              <button
                key={i}
                ref={isActive ? activeButtonRef : undefined}
                onClick={() => setActiveMonth(i)}
                className={cn(
                  'flex flex-col items-center shrink-0 rounded-xl px-2.5 py-1 gap-0.5',
                  'transition-all duration-200 ease-out',
                  isActive
                    ? 'bg-violet-100 scale-105 shadow-sm'
                    : 'hover:bg-muted active:scale-95'
                )}
              >
                <span className={cn(
                  'text-xs font-medium leading-none',
                  isActive
                    ? 'text-violet-700 font-bold'
                    : isCurrentMonth
                      ? 'text-violet-500'
                      : 'text-foreground'
                )}>
                  {label}
                </span>
                <div className={cn(
                  'h-1 w-1 rounded-full transition-all',
                  hasDot
                    ? isActive ? 'bg-violet-500' : 'bg-muted-foreground/50'
                    : 'bg-transparent'
                )} />
              </button>
            )
          })}
        </div>
      </CardHeader>

      <div className="h-px bg-border mx-4" />

      <CardContent className="px-4 py-2">
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-1 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState description="No interviews this month" />
        ) : (
          <div>
            {filtered.map((interview, idx) => {
              const color = BAR_COLORS[idx % BAR_COLORS.length]
              const platform =
                interview.interview_type === 'online' && interview.interview_location
                  ? getPlatformConfig(interview.interview_location)
                  : null

              const locationIcon = (() => {
                if (platform) {
                  const Icon = platform.icon
                  return interview.interview_link ? (
                    <a
                      href={interview.interview_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Join ${platform.label}`}
                      className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ) : (
                    <Icon className="h-5 w-5 shrink-0 opacity-50" />
                  )
                }
                if (interview.interview_type === 'in_person') {
                  return <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                }
                if (interview.interview_location) {
                  return <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                }
                return null
              })()

              const name = `${interview.candidates.first_name} ${interview.candidates.last_name}`

              return (
                <div key={interview.id}>
                  <div className="flex gap-3 py-2">
                    <div className={cn('w-1 rounded-full shrink-0 self-stretch min-h-[2rem]', color)} />
                    <Video className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">
                        {name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 min-w-0">
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatDayLabel(interview.interview_date)}
                        </span>
                        <span className="text-muted-foreground/40 text-[11px] shrink-0">·</span>
                        <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                          {formatTime(interview.interview_time)}
                        </span>
                        <span className="text-muted-foreground/40 text-[11px] shrink-0">·</span>
                        <span className="text-[11px] text-muted-foreground truncate min-w-0">
                          {interview.jobs.title}
                        </span>
                      </div>
                    </div>
                    {locationIcon}
                  </div>
                  {idx < filtered.length - 1 && <div className="h-px bg-border ml-4" />}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

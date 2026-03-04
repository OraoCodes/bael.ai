'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useWorkspace } from '@/components/providers/workspace-provider'
import {
  useAiInsights,
  useRefreshInsights,
  useDismissSuggestion,
} from '@/lib/queries/insights'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
]


function InsightsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2.5">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function AiInsightsCard() {
  const { workspace, role } = useWorkspace()
  const base = `/w/${workspace.slug}`
  const { data: insights, isLoading } = useAiInsights()
  const refreshMutation = useRefreshInsights()
  const dismissMutation = useDismissSuggestion()

  const canRefresh = role !== 'viewer'

  // Flatten all suggestions with their job title, preserve score order
  const flatMatches = useMemo(() =>
    (insights ?? []).flatMap((job) =>
      job.suggestions.map((s) => ({ ...s, jobTitle: job.title }))
    ),
    [insights]
  )

  const lastUpdated = insights
    ?.flatMap((j) => j.suggestions)
    .sort((a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime())[0]
    ?.computed_at

  const handleRefresh = async () => {
    try {
      const result = await refreshMutation.mutateAsync(true)
      if (result.suggestions_created > 0) {
        toast.success(`Found ${result.suggestions_created} match${result.suggestions_created !== 1 ? 'es' : ''} across ${result.jobs_processed} job${result.jobs_processed !== 1 ? 's' : ''}`)
      } else {
        toast.info('No new matches found. Try adding more candidates or job details.')
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to generate insights')
    }
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-600 px-2.5 py-0.5 text-[11px] font-semibold mb-2">
              <Sparkles className="h-3 w-3" />
              AI Insights
            </div>
            <p className="text-[15px] font-bold text-foreground leading-snug">
              Top candidates for<br />open roles
            </p>
          </div>
          {canRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-50 mt-0.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh insights</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Loading */}
        {isLoading && <InsightsSkeleton />}

        {/* Empty */}
        {!isLoading && flatMatches.length === 0 && (
          <div className="py-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No suggestions yet</p>
            {canRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {refreshMutation.isPending ? 'Analyzing candidates...' : 'Generate AI insights'}
              </button>
            )}
          </div>
        )}

        {/* Flat candidate list */}
        {flatMatches.length > 0 && (
          <div className="space-y-2">
            {flatMatches.map((match, idx) => (
              <div
                key={match.id}
                className="flex items-center gap-3 rounded-2xl bg-zinc-50 pl-3 pr-2 py-2.5 group"
              >
                {/* Avatar */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                  {getInitials(match.candidate.first_name, match.candidate.last_name)}
                </div>

                {/* Name + job title */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`${base}/candidates/${match.candidate.id}`}
                    className="text-[13px] font-semibold text-foreground truncate block hover:underline leading-tight"
                  >
                    {match.candidate.first_name} {match.candidate.last_name}
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-[11px] text-muted-foreground truncate cursor-default leading-tight">
                        {match.jobTitle}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      {match.reasoning}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Score + Rank pushed to far right */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <span className="text-base font-bold tabular-nums text-foreground">
                    {Math.round(match.score * 100)}%
                  </span>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-zinc-200/70 text-[10px] font-semibold text-zinc-500">
                    {idx + 1}
                  </span>
                </div>

                {/* Dismiss on hover */}
                {canRefresh && (
                  <button
                    type="button"
                    onClick={() => dismissMutation.mutate(match.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-all"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {lastUpdated && (
              <p className="text-[10px] text-zinc-400 text-center pt-1">
                Updated {dayjs(lastUpdated).fromNow()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

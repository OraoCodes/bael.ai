'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTopCandidates } from '@/lib/queries/metrics'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
]

const RANK_STYLES = [
  'bg-amber-400 text-white',
  'bg-slate-300 text-slate-700',
  'bg-orange-300 text-white',
]

export function TopCandidatesCard() {
  const { data: candidates, isLoading } = useTopCandidates()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          AI Insights
        </CardTitle>
        <p className="text-base font-semibold text-foreground -mt-1">
          Top candidates to convert
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : !candidates || candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Run AI matching on jobs to see top candidates.
          </p>
        ) : (
          <div className="space-y-4">
            {candidates.slice(0, 3).map((candidate, index) => (
              <div key={candidate.id} className="flex items-center gap-3">
                {/* Rank badge */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${RANK_STYLES[index] || 'bg-gray-300 text-white'}`}
                >
                  {index + 1}
                </div>
                {/* Avatar */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_COLORS[index] || 'bg-gray-100 text-gray-600'}`}
                >
                  {getInitials(candidate.name)}
                </div>
                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{candidate.name}</p>
                  {candidate.jobTitle && (
                    <p className="text-xs text-muted-foreground truncate">{candidate.jobTitle}</p>
                  )}
                </div>
                {/* Conversion probability */}
                <div className="shrink-0">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    {candidate.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  Code2,
  Megaphone,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  Headphones,
  Pen,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useOpenJobs, OPEN_JOBS_PAGE_SIZE } from '@/lib/queries/jobs'

const FUNCTION_ICONS: Record<string, React.ElementType> = {
  engineering: Code2,
  design: Pen,
  product: Package,
  marketing: Megaphone,
  sales: TrendingUp,
  operations: Settings,
  hr: Users,
  finance: DollarSign,
  support: Headphones,
  other: Briefcase,
}

function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 48 * 60 * 60 * 1000
}

export function OpenJobsCard() {
  const [page, setPage] = useState(0)
  const { workspace } = useWorkspace()
  const { data, isLoading } = useOpenJobs(page)
  const base = `/w/${workspace.slug}`

  const jobs = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / OPEN_JOBS_PAGE_SIZE)
  const showPagination = total > OPEN_JOBS_PAGE_SIZE

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-foreground">Open Jobs</p>
          <Link
            href={`${base}/jobs`}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ))}
          </div>
        ) : !jobs.length && page === 0 ? (
          <EmptyState description="No open jobs yet" />
        ) : (
          <>
            <div className="divide-y divide-zinc-100">
              {jobs.map((job) => {
                const Icon = FUNCTION_ICONS[job.job_function ?? ''] ?? Briefcase
                const count = job.candidate_applications?.[0]?.count ?? 0
                const jobIsNew = isNew(job.created_at)
                const label = job.department || (job.job_function
                  ? job.job_function.charAt(0).toUpperCase() + job.job_function.slice(1).replace(/_/g, ' ')
                  : 'General')

                return (
                  <Link
                    key={job.id}
                    href={`${base}/jobs/${job.id}`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-70 transition-opacity"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-foreground leading-snug truncate">
                          {job.title}
                        </p>
                        {jobIsNew && (
                          <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{label}</span>
                        <span className="mx-0.5 text-zinc-300">·</span>
                        <span className="shrink-0">{count} {count === 1 ? 'Applicant' : 'Applicants'}</span>
                      </p>
                    </div>
                  </Link>
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

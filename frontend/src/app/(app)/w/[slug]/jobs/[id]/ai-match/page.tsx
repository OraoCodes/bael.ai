'use client'

import { useParams } from 'next/navigation'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { AiMatchButton } from '@/components/ai/ai-match-button'
import { AiScoreDisplay } from '@/components/ai/ai-score-display'
import { useJob } from '@/lib/queries/jobs'
import { useApplicationsByJob } from '@/lib/queries/applications'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { CandidateApplicationWithDetails } from '@/lib/types/database'
import { formatFullName, formatDate } from '@/lib/utils/format'
import Link from 'next/link'

export default function AiMatchPage() {
  const { id: jobId } = useParams<{ id: string }>()
  const { workspace } = useWorkspace()
  const { data: job, isLoading: jobLoading } = useJob(jobId)
  const { data: applications, isLoading: appsLoading } = useApplicationsByJob(jobId)
  const base = `/w/${workspace.slug}`

  if (jobLoading || appsLoading) {
    return <PageSpinner />
  }
  if (!job) return <ResultView status="404" title="Job not found" />

  const scored = (applications || [])
    .filter((a) => a.ai_match_score !== null)
    .sort((a, b) => (b.ai_match_score?.score ?? 0) - (a.ai_match_score?.score ?? 0))

  const unscored = (applications || []).filter((a) => a.ai_match_score === null)

  const rows = [...scored, ...unscored]

  const getProgressColorClass = (pct: number) => {
    if (pct >= 70) return '[&>div]:bg-green-500'
    if (pct >= 40) return '[&>div]:bg-yellow-500'
    return '[&>div]:bg-red-500'
  }

  return (
    <>
      <PageHeader
        title={`AI Match — ${job.title}`}
        breadcrumbs={[
          { label: 'Jobs', href: `${base}/jobs` },
          { label: job.title, href: `${base}/jobs/${jobId}` },
          { label: 'AI Match' },
        ]}
        extra={<AiMatchButton jobId={jobId} />}
      />

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {scored.length} scored · {unscored.length} not yet scored
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Current Stage</TableHead>
            <TableHead className="w-[200px]">AI Score</TableHead>
            <TableHead className="w-[140px]">Last Scored</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((record) => {
            const pct = record.ai_match_score
              ? Math.round(record.ai_match_score.score * 100)
              : null
            return (
              <TableRow key={record.id}>
                <TableCell>
                  <Link
                    href={`${base}/candidates/${record.candidate_id}`}
                    className="text-primary hover:underline"
                  >
                    {formatFullName(record.candidates.first_name, record.candidates.last_name)}
                  </Link>
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border"
                    style={{ borderLeft: `3px solid ${record.pipeline_stages.color}` }}
                  >
                    {record.pipeline_stages.name}
                  </span>
                </TableCell>
                <TableCell>
                  {pct === null ? (
                    <Badge variant="secondary">Not scored</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={pct}
                        className={cn('h-2 w-24', getProgressColorClass(pct))}
                      />
                      <AiScoreDisplay score={record.ai_match_score!} />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {record.ai_match_score
                    ? formatDate(record.ai_match_score.computed_at)
                    : '-'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

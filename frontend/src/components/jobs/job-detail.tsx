'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Job } from '@/lib/types/database'
import { formatDate, formatSalary } from '@/lib/utils/format'
import { JobStatusBadge } from './job-status-badge'

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold">{job.title}</h2>
          <JobStatusBadge status={job.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Department</dt>
          <dd>{job.department || '-'}</dd>

          <dt className="text-muted-foreground">Location</dt>
          <dd>{job.location || '-'}</dd>

          <dt className="text-muted-foreground">Employment Type</dt>
          <dd>{job.employment_type || '-'}</dd>

          <dt className="text-muted-foreground">Salary</dt>
          <dd>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</dd>

          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDate(job.created_at)}</dd>

          {job.closed_at && (
            <>
              <dt className="text-muted-foreground">Closed</dt>
              <dd>{formatDate(job.closed_at)}</dd>
            </>
          )}
        </dl>

        {job.description && (
          <>
            <Separator className="my-4" />
            <h3 className="text-base font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

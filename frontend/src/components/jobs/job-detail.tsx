'use client'

import { useState } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Job } from '@/lib/types/database'
import { formatDate, formatSalary } from '@/lib/utils/format'
import { JobStatusBadge } from './job-status-badge'
import { useWorkspace } from '@/components/providers/workspace-provider'

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  const { workspace } = useWorkspace()
  const [copied, setCopied] = useState(false)
  const publicUrl = job.slug && job.status === 'open'
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/jobs/${workspace.slug}/${job.slug}`
    : null

  const copyUrl = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold">{job.title}</h2>
          <JobStatusBadge status={job.status} />
        </div>

        {publicUrl && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
            <span className="text-blue-700 font-medium">Public URL:</span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate flex-1"
            >
              {publicUrl}
            </a>
            <button
              onClick={copyUrl}
              className="text-blue-500 hover:text-blue-700 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

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

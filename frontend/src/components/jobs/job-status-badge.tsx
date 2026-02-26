'use client'

import { cn } from '@/lib/utils'
import type { JobStatus } from '@/lib/types/database'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/utils/constants'

interface JobStatusBadgeProps {
  status: JobStatus
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        JOB_STATUS_COLORS[status]
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  )
}

'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Bot, Star } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { CandidateApplicationWithDetails } from '@/lib/types/database'
import { formatFullName, formatDate } from '@/lib/utils/format'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useUpdateApplicationRating } from '@/lib/queries/applications'
import { CAN_WRITE } from '@/lib/utils/constants'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface PipelineCardProps {
  application: CandidateApplicationWithDetails
}

function AiScoreBadge({ score, reasoning }: { score: number; reasoning: string }) {
  const pct = Math.round(score * 100)
  const colorClass =
    pct >= 70
      ? 'bg-green-100 text-green-700'
      : pct >= 40
        ? 'bg-orange-100 text-orange-700'
        : 'bg-red-100 text-red-700'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ml-1',
            colorClass
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Bot className="h-3 w-3" />
          {pct}%
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold text-sm mb-1">AI Match Score</p>
        <p className="font-medium text-sm mb-2">Score: {pct}%</p>
        <p className="text-xs text-muted-foreground">{reasoning}</p>
      </PopoverContent>
    </Popover>
  )
}

export function PipelineCard({ application }: PipelineCardProps) {
  const { workspace, role } = useWorkspace()
  const updateRating = useUpdateApplicationRating()

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: {
      applicationId: application.id,
      jobId: application.job_id,
      currentStageId: application.stage_id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const candidate = application.candidates
  const fullName = formatFullName(candidate.first_name, candidate.last_name)
  const canWrite = CAN_WRITE.includes(role)

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div className="mb-2 rounded-lg border bg-card p-2.5 shadow-sm select-none">
        <div className="flex items-start justify-between">
          <Link
            href={`/w/${workspace.slug}/candidates/${candidate.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-[13px] leading-snug hover:underline"
          >
            {fullName}
          </Link>
          {application.ai_match_score && (
            <AiScoreBadge
              score={application.ai_match_score.score}
              reasoning={application.ai_match_score.reasoning}
            />
          )}
        </div>

        <div className="mt-1 text-[11px] text-muted-foreground">
          {formatDate(application.applied_at)}
        </div>

        <div
          className="mt-1.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                disabled={!canWrite}
                onClick={() =>
                  canWrite &&
                  updateRating.mutate({
                    id: application.id,
                    rating: i + 1 === application.rating ? null : i + 1,
                    jobId: application.job_id,
                  })
                }
                className={cn('disabled:cursor-default', canWrite && 'cursor-pointer')}
              >
                <Star
                  className={cn(
                    'h-3 w-3',
                    i < (application.rating ?? 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

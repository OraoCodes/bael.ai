'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { CandidateApplicationWithDetails, PipelineStage } from '@/lib/types/database'
import { PipelineCard } from './pipeline-card'

interface PipelineColumnProps {
  stage: PipelineStage
  applications: CandidateApplicationWithDetails[]
}

export function PipelineColumn({ stage, applications }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div
      className={cn(
        'w-[260px] shrink-0 flex flex-col rounded-lg border transition-colors duration-150',
        isOver ? 'bg-indigo-50 border-indigo-500' : 'bg-muted/40 border-border'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b border-border rounded-t-lg"
        style={{ borderLeftWidth: 4, borderLeftColor: stage.color }}
      >
        <span className="text-[13px] font-semibold">{stage.name}</span>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
          {applications.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 min-h-[80px] overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        {applications.map((app) => (
          <PipelineCard key={app.id} application={app} />
        ))}
      </div>
    </div>
  )
}

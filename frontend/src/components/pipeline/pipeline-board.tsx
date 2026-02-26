'use client'

import { DndContext, DragEndEvent, pointerWithin } from '@dnd-kit/core'
import { toast } from 'sonner'
import type { CandidateApplicationWithDetails, PipelineStage } from '@/lib/types/database'
import { PipelineColumn } from './pipeline-column'
import { useMoveApplication } from '@/lib/queries/applications'

interface PipelineBoardProps {
  stages: PipelineStage[]
  applications: CandidateApplicationWithDetails[]
  jobId: string
}

export function PipelineBoard({ stages, applications, jobId }: PipelineBoardProps) {
  const moveApplication = useMoveApplication()

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const applicationId = active.id as string
    const newStageId = over.id as string
    const app = applications.find((a) => a.id === applicationId)

    if (!app || app.stage_id === newStageId) return

    moveApplication.mutate(
      { applicationId, newStageId, jobId },
      {
        onError: () => {
          toast.error('Failed to move candidate. Please try again.')
        },
      }
    )
  }

  const appsByStage = stages.reduce<Record<string, CandidateApplicationWithDetails[]>>(
    (acc, stage) => {
      acc[stage.id] = applications.filter((a) => a.stage_id === stage.id)
      return acc
    },
    {}
  )

  return (
    <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            applications={appsByStage[stage.id] || []}
          />
        ))}
      </div>
    </DndContext>
  )
}

'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, pointerWithin } from '@dnd-kit/core'
import { toast } from 'sonner'
import type { CandidateApplicationWithDetails, PipelineStage } from '@/lib/types/database'
import { PipelineColumn } from './pipeline-column'
import { RejectionModal } from './rejection-modal'
import { useMoveApplication } from '@/lib/queries/applications'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'

interface PipelineBoardProps {
  stages: PipelineStage[]
  applications: CandidateApplicationWithDetails[]
  jobId: string
}

interface PendingRejection {
  applicationId: string
  application: CandidateApplicationWithDetails
  newStageId: string
}

export function PipelineBoard({ stages, applications, jobId }: PipelineBoardProps) {
  const moveApplication = useMoveApplication()
  const supabase = createClient()
  const { workspaceId } = useWorkspace()

  const [pendingRejection, setPendingRejection] = useState<PendingRejection | null>(null)

  const rejectedStage = stages.find((s) => s.name === 'Rejected')

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const applicationId = active.id as string
    const newStageId = over.id as string
    const app = applications.find((a) => a.id === applicationId)

    if (!app || app.stage_id === newStageId) return

    // Intercept drops onto the Rejected stage — show the rejection modal first
    if (rejectedStage && newStageId === rejectedStage.id) {
      setPendingRejection({ applicationId, application: app, newStageId })
      return
    }

    moveApplication.mutate(
      { applicationId, newStageId, jobId },
      { onError: () => toast.error('Failed to move candidate. Please try again.') }
    )
  }

  const handleRejectionConfirm = async (reason: string, sendEmail: boolean) => {
    if (!pendingRejection) return
    const { applicationId, newStageId } = pendingRejection

    // Close modal immediately — mutation has its own optimistic update
    setPendingRejection(null)

    moveApplication.mutate(
      { applicationId, newStageId, jobId, rejectionReason: reason || undefined },
      {
        onError: () => toast.error('Failed to move candidate. Please try again.'),
        onSuccess: async () => {
          if (!sendEmail) return

          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const res = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'rejection',
                  application_id: applicationId,
                  workspace_id: workspaceId,
                }),
              }
            )

            if (res.ok) {
              toast.success('Candidate moved and rejection email sent.')
            } else {
              const body = await res.json().catch(() => ({}))
              toast.warning(`Moved to Rejected, but email failed: ${body.error ?? 'unknown error'}`)
            }
          } catch {
            toast.warning('Moved to Rejected, but could not send email.')
          }
        },
      }
    )
  }

  const handleRejectionCancel = () => {
    setPendingRejection(null)
  }

  const appsByStage = stages.reduce<Record<string, CandidateApplicationWithDetails[]>>(
    (acc, stage) => {
      acc[stage.id] = applications.filter((a) => a.stage_id === stage.id)
      return acc
    },
    {}
  )

  return (
    <>
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

      <RejectionModal
        open={!!pendingRejection}
        application={pendingRejection?.application ?? null}
        onConfirm={handleRejectionConfirm}
        onCancel={handleRejectionCancel}
      />
    </>
  )
}

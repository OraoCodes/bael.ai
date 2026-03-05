'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApplicationsByCandidate } from '@/lib/queries/applications'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE } from '@/lib/utils/constants'
import { formatDate } from '@/lib/utils/format'
import { AddToJobDialog } from './add-to-job-dialog'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-600',
}

interface CandidateApplicationsTabProps {
  candidateId: string
}

export function CandidateApplicationsTab({ candidateId }: CandidateApplicationsTabProps) {
  const { workspace, role } = useWorkspace()
  const { data: applications, isLoading } = useApplicationsByCandidate(candidateId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const base = `/w/${workspace.slug}`

  const existingJobIds = new Set((applications || []).map((a) => (a.jobs as { id: string })?.id).filter(Boolean))

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-4">
      {CAN_WRITE.includes(role) && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add to Job
          </Button>
        </div>
      )}

      {(!applications || applications.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This candidate has not been added to any jobs yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => {
            const job = app.jobs as { id: string; title: string; status: string } | null
            const stage = app.pipeline_stages as { id: string; name: string; color: string } | null
            return (
              <Card key={app.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <Link
                        href={`${base}/jobs/${job?.id}/pipeline`}
                        className="text-sm font-medium hover:underline"
                      >
                        {job?.title ?? 'Unknown Job'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Applied {formatDate(app.applied_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stage && (
                      <Badge variant="outline" className="text-xs" style={{ borderColor: stage.color, color: stage.color }}>
                        {stage.name}
                      </Badge>
                    )}
                    {job && (
                      <Badge className={`text-xs ${STATUS_COLORS[job.status] ?? ''}`} variant="secondary">
                        {job.status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AddToJobDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidateId={candidateId}
        existingJobIds={existingJobIds}
      />
    </div>
  )
}

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { PageHeader } from '@/components/shared/page-header'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { useJob } from '@/lib/queries/jobs'
import { useStages } from '@/lib/queries/pipeline-stages'
import { useApplicationsByJob, useCreateApplication } from '@/lib/queries/applications'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useCandidates } from '@/lib/queries/candidates'
import { CAN_WRITE } from '@/lib/utils/constants'
import { formatFullName } from '@/lib/utils/format'

export default function PipelinePage() {
  const { id: jobId } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspace, role } = useWorkspace()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [candidateId, setCandidateId] = useState<string>('')
  const base = `/w/${workspace.slug}`

  const { data: job, isLoading: jobLoading } = useJob(jobId)
  const { data: stages, isLoading: stagesLoading } = useStages()
  const { data: applications, isLoading: appsLoading } = useApplicationsByJob(jobId)
  const { data: candidatesData } = useCandidates({ pageSize: 100 })
  const createApplication = useCreateApplication()

  const isLoading = jobLoading || stagesLoading || appsLoading

  if (isLoading) return <PageSpinner />
  if (!job) return <ResultView status="404" title="Job not found" />

  const existingCandidateIds = new Set((applications || []).map((a) => a.candidate_id))
  const availableCandidates = (candidatesData?.data || []).filter(
    (c) => !existingCandidateIds.has(c.id)
  )

  const handleAddCandidate = async () => {
    if (!candidateId) {
      toast.error('Select a candidate')
      return
    }
    try {
      const firstStage = stages?.[0]
      if (!firstStage) throw new Error('No pipeline stages found')
      await createApplication.mutateAsync({
        candidate_id: candidateId,
        job_id: jobId,
        stage_id: firstStage.id,
      })
      toast.success('Candidate added to pipeline')
      setAddModalOpen(false)
      setCandidateId('')
    } catch {
      toast.error('Failed to add candidate')
    }
  }

  const handleCloseModal = () => {
    setAddModalOpen(false)
    setCandidateId('')
  }

  return (
    <>
      <PageHeader
        title={`${job.title} — Pipeline`}
        breadcrumbs={[
          { label: 'Jobs', href: `${base}/jobs` },
          { label: job.title, href: `${base}/jobs/${jobId}` },
          { label: 'Pipeline' },
        ]}
        extra={
          CAN_WRITE.includes(role) && (
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          )
        }
      />

      <PipelineBoard
        stages={stages || []}
        applications={applications || []}
        jobId={jobId}
      />

      <Dialog open={addModalOpen} onOpenChange={(o) => { if (!o) { handleCloseModal() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Candidate to Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="candidate">Candidate</Label>
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger id="candidate">
                  <SelectValue placeholder="Search candidates..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCandidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatFullName(c.first_name, c.last_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCandidate}
              disabled={createApplication.isPending}
            >
              {createApplication.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState } from 'react'
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
import { useJobs } from '@/lib/queries/jobs'
import { useStages } from '@/lib/queries/pipeline-stages'
import { useCreateApplication } from '@/lib/queries/applications'

interface AddToJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: string
  existingJobIds: Set<string>
}

export function AddToJobDialog({
  open,
  onOpenChange,
  candidateId,
  existingJobIds,
}: AddToJobDialogProps) {
  const [jobId, setJobId] = useState('')
  const [stageId, setStageId] = useState('')

  const { data: jobsData } = useJobs({ status: 'open', pageSize: 100 })
  const { data: stages } = useStages()
  const createApplication = useCreateApplication()

  const availableJobs = (jobsData?.data || []).filter(
    (j) => !existingJobIds.has(j.id)
  )

  const handleClose = () => {
    onOpenChange(false)
    setJobId('')
    setStageId('')
  }

  const handleSubmit = async () => {
    if (!jobId) {
      toast.error('Select a job')
      return
    }
    const selectedStage = stageId || stages?.[0]?.id
    if (!selectedStage) {
      toast.error('No pipeline stages found')
      return
    }
    try {
      await createApplication.mutateAsync({
        candidate_id: candidateId,
        job_id: jobId,
        stage_id: selectedStage,
      })
      toast.success('Candidate added to job pipeline')
      handleClose()
    } catch {
      toast.error('Failed to add candidate to job')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="job">Job</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger id="job">
                <SelectValue placeholder="Select an open job..." />
              </SelectTrigger>
              <SelectContent>
                {availableJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage">Pipeline Stage</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger id="stage">
                <SelectValue placeholder={stages?.[0]?.name ?? 'Select stage...'} />
              </SelectTrigger>
              <SelectContent>
                {(stages || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createApplication.isPending}>
            {createApplication.isPending ? 'Adding...' : 'Add to Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

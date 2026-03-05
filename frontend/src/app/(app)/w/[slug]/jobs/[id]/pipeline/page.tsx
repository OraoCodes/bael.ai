'use client'

import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
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
  const [stageId, setStageId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const base = `/w/${workspace.slug}`

  const { data: job, isLoading: jobLoading } = useJob(jobId)
  const { data: stages, isLoading: stagesLoading } = useStages()
  const { data: applications, isLoading: appsLoading } = useApplicationsByJob(jobId)
  const { data: candidatesData } = useCandidates({ pageSize: 100 })
  const createApplication = useCreateApplication()

  const isLoading = jobLoading || stagesLoading || appsLoading

  const existingCandidateIds = new Set((applications || []).map((a) => a.candidate_id))
  const availableCandidates = useMemo(() => {
    const candidates = (candidatesData?.data || []).filter(
      (c) => !existingCandidateIds.has(c.id)
    )
    if (!searchQuery.trim()) return candidates
    const q = searchQuery.toLowerCase()
    return candidates.filter((c) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [candidatesData?.data, existingCandidateIds, searchQuery])

  if (isLoading) return <PageSpinner />
  if (!job) return <ResultView status="404" title="Job not found" />

  const handleAddCandidate = async () => {
    if (!candidateId) {
      toast.error('Select a candidate')
      return
    }
    try {
      const selectedStage = stageId || stages?.[0]?.id
      if (!selectedStage) throw new Error('No pipeline stages found')
      await createApplication.mutateAsync({
        candidate_id: candidateId,
        job_id: jobId,
        stage_id: selectedStage,
      })
      toast.success('Candidate added to pipeline')
      handleCloseModal()
    } catch {
      toast.error('Failed to add candidate')
    }
  }

  const handleCloseModal = () => {
    setAddModalOpen(false)
    setCandidateId('')
    setStageId('')
    setSearchQuery('')
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
              <Input
                placeholder="Filter by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger id="candidate">
                  <SelectValue placeholder="Select a candidate..." />
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

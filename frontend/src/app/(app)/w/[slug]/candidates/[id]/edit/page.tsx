'use client'

import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { PageHeader } from '@/components/shared/page-header'
import { CandidateForm } from '@/components/candidates/candidate-form'
import { useCandidate, useUpdateCandidate } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { formatFullName } from '@/lib/utils/format'
import type { Candidate } from '@/lib/types/database'

export default function EditCandidatePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspace } = useWorkspace()
  const { data: candidate, isLoading, error } = useCandidate(id)
  const updateMutation = useUpdateCandidate()
  const base = `/w/${workspace.slug}`

  if (isLoading) return <PageSpinner />
  if (error || !candidate) return <ResultView status="404" title="Candidate not found" />

  const handleSubmit = async (values: Partial<Candidate>) => {
    try {
      await updateMutation.mutateAsync({ id, ...values })
      toast.success('Candidate updated')
      router.push(`${base}/candidates/${id}`)
    } catch {
      toast.error('Failed to update candidate')
    }
  }

  return (
    <>
      <PageHeader
        title={`Edit ${formatFullName(candidate.first_name, candidate.last_name)}`}
        breadcrumbs={[
          { label: 'Candidates', href: `${base}/candidates` },
          {
            label: formatFullName(candidate.first_name, candidate.last_name),
            href: `${base}/candidates/${id}`,
          },
          { label: 'Edit' },
        ]}
      />
      <Card>
        <CardContent className="pt-6">
          <CandidateForm
            initialValues={candidate}
            onSubmit={handleSubmit}
            loading={updateMutation.isPending}
            submitLabel="Update Candidate"
          />
        </CardContent>
      </Card>
    </>
  )
}

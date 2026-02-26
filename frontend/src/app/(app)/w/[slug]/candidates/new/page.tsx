'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { CandidateForm } from '@/components/candidates/candidate-form'
import { useCreateCandidate } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Candidate } from '@/lib/types/database'

export default function NewCandidatePage() {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const createMutation = useCreateCandidate()
  const base = `/w/${workspace.slug}`

  const handleSubmit = async (values: Partial<Candidate>) => {
    try {
      await createMutation.mutateAsync(values)
      toast.success('Candidate created')
      router.push(`${base}/candidates`)
    } catch {
      toast.error('Failed to create candidate')
    }
  }

  return (
    <>
      <PageHeader
        title="Add Candidate"
        breadcrumbs={[
          { label: 'Candidates', href: `${base}/candidates` },
          { label: 'New' },
        ]}
      />
      <Card>
        <CardContent className="pt-6">
          <CandidateForm
            onSubmit={handleSubmit}
            loading={createMutation.isPending}
            submitLabel="Create Candidate"
          />
        </CardContent>
      </Card>
    </>
  )
}

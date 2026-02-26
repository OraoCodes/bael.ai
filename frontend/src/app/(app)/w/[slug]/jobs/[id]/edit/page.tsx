'use client'

import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { PageHeader } from '@/components/shared/page-header'
import { JobForm } from '@/components/jobs/job-form'
import { useJob, useUpdateJob } from '@/lib/queries/jobs'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Job } from '@/lib/types/database'

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspace } = useWorkspace()
  const { data: job, isLoading, error } = useJob(id)
  const updateMutation = useUpdateJob()
  const base = `/w/${workspace.slug}`

  if (isLoading) return <PageSpinner />
  if (error || !job) return <ResultView status="404" title="Job not found" />

  const handleSubmit = async (values: Partial<Job>) => {
    try {
      await updateMutation.mutateAsync({ id, ...values })
      toast.success('Job updated')
      router.push(`${base}/jobs/${id}`)
    } catch {
      toast.error('Failed to update job')
    }
  }

  return (
    <>
      <PageHeader
        title={`Edit ${job.title}`}
        breadcrumbs={[
          { label: 'Jobs', href: `${base}/jobs` },
          { label: job.title, href: `${base}/jobs/${id}` },
          { label: 'Edit' },
        ]}
      />
      <Card>
        <CardContent className="pt-6">
          <JobForm
            initialValues={job}
            onSubmit={handleSubmit}
            loading={updateMutation.isPending}
            submitLabel="Update Job"
          />
        </CardContent>
      </Card>
    </>
  )
}

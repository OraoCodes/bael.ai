'use client'

import { PageHeader } from '@/components/shared/page-header'
import { JobCreationWizard } from '@/components/jobs/job-creation-wizard'
import { useWorkspace } from '@/components/providers/workspace-provider'

export default function NewJobPage() {
  const { workspace } = useWorkspace()
  const base = `/w/${workspace.slug}`

  return (
    <>
      <PageHeader
        title="Post a Job"
        breadcrumbs={[
          { label: 'Jobs', href: `${base}/jobs` },
          { label: 'New' },
        ]}
      />
      <JobCreationWizard />
    </>
  )
}

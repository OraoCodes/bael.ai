'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { JobTable } from '@/components/jobs/job-table'
import { ConfirmDelete } from '@/components/shared/confirm-delete'
import { EmptyState } from '@/components/shared/empty-state'
import { useJobs, useDeleteJob } from '@/lib/queries/jobs'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE } from '@/lib/utils/constants'
import type { JobStatus } from '@/lib/types/database'

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'draft', label: 'Draft' },
  { key: 'paused', label: 'Paused' },
  { key: 'closed', label: 'Closed' },
  { key: 'archived', label: 'Archived' },
]

export default function JobsPage() {
  const router = useRouter()
  const { workspace, role } = useWorkspace()
  const [statusFilter, setStatusFilter] = useState<JobStatus | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const base = `/w/${workspace.slug}`

  const { data, isLoading } = useJobs({ status: statusFilter, page, pageSize })
  const deleteMutation = useDeleteJob()

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      toast.success('Job deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete job')
    }
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        extra={
          CAN_WRITE.includes(role) && (
            <Button onClick={() => router.push(`${base}/jobs/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              Post Job
            </Button>
          )
        }
      />

      <Tabs
        value={statusFilter || ''}
        onValueChange={(key) => {
          setStatusFilter(key ? (key as JobStatus) : undefined)
          setPage(1)
        }}
        className="mb-4"
      >
        <TabsList variant="line">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {data && data.total === 0 ? (
        <EmptyState
          description="No jobs found"
          actionLabel={CAN_WRITE.includes(role) ? 'Post a Job' : undefined}
          onAction={CAN_WRITE.includes(role) ? () => router.push(`${base}/jobs/new`) : undefined}
        />
      ) : (
        <JobTable
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          loading={isLoading}
          onPageChange={(p, ps) => { setPage(p); setPageSize(ps) }}
          onDelete={setDeleteId}
        />
      )}

      <ConfirmDelete
        title="Delete Job"
        description="This job posting will be removed along with its pipeline data."
        open={!!deleteId}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}

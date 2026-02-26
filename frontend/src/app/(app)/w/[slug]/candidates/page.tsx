'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { CandidateTable } from '@/components/candidates/candidate-table'
import { ConfirmDelete } from '@/components/shared/confirm-delete'
import { EmptyState } from '@/components/shared/empty-state'
import { useCandidates, useDeleteCandidate } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE } from '@/lib/utils/constants'

export default function CandidatesPage() {
  const router = useRouter()
  const { workspace, role } = useWorkspace()
  const [search, setSearch] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useCandidates({ search, tags, page, pageSize })
  const deleteMutation = useDeleteCandidate()

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      toast.success('Candidate deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete candidate')
    }
  }

  return (
    <>
      <PageHeader
        title="Candidates"
        extra={
          CAN_WRITE.includes(role) && (
            <Button
              onClick={() => router.push(`/w/${workspace.slug}/candidates/new`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          )
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-[300px]"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Input
          placeholder="Filter by tags (comma separated)"
          value={tags.join(', ')}
          onChange={(e) => {
            setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))
            setPage(1)
          }}
          className="w-[250px]"
        />
      </div>

      {data && data.total === 0 && !search && tags.length === 0 ? (
        <EmptyState
          description="No candidates yet"
          actionLabel={CAN_WRITE.includes(role) ? 'Add Candidate' : undefined}
          onAction={CAN_WRITE.includes(role) ? () => router.push(`/w/${workspace.slug}/candidates/new`) : undefined}
        />
      ) : (
        <CandidateTable
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          loading={isLoading}
          onPageChange={(p, ps) => {
            setPage(p)
            setPageSize(ps)
          }}
          onDelete={setDeleteId}
        />
      )}

      <ConfirmDelete
        title="Delete Candidate"
        description="This candidate will be removed. This action can be undone by an admin."
        open={!!deleteId}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}

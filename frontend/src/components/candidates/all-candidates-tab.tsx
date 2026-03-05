'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CandidateTable } from '@/components/candidates/candidate-table'
import { ConfirmDelete } from '@/components/shared/confirm-delete'
import { EmptyState } from '@/components/shared/empty-state'
import { useCandidates, useDeleteCandidate } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE, CANDIDATE_SOURCES } from '@/lib/utils/constants'

const SENIORITY_OPTIONS = [
  { label: 'Junior', value: 'junior' },
  { label: 'Mid-level', value: 'mid-level' },
  { label: 'Senior', value: 'senior' },
  { label: 'Staff', value: 'staff' },
  { label: 'Principal', value: 'principal' },
]

export function AllCandidatesTab() {
  const { role } = useWorkspace()

  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [seniority, setSeniority] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useCandidates({
    search: search || undefined,
    source: source || undefined,
    seniority: seniority || undefined,
    sortBy,
    sortDir,
    page,
    pageSize,
  })
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

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const hasActiveFilters = !!source || !!seniority || !!search

  const clearAll = () => {
    setSearch('')
    setSource('')
    setSeniority('')
    setPage(1)
  }

  const sourceLabel = source
    ? CANDIDATE_SOURCES.find((s) => s.value === source)?.label ?? source
    : ''
  const seniorityLabel = seniority
    ? SENIORITY_OPTIONS.find((s) => s.value === seniority)?.label ?? seniority
    : ''

  return (
    <div className="py-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-[260px] h-9"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <Select
          value={source || '_all'}
          onValueChange={(val) => {
            setSource(val === '_all' ? '' : val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All sources</SelectItem>
            {CANDIDATE_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={seniority || '_all'}
          onValueChange={(val) => {
            setSeniority(val === '_all' ? '' : val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Seniority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All levels</SelectItem>
            {SENIORITY_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {search && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: {search}
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {source && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Source: {sourceLabel}
              <button
                type="button"
                onClick={() => {
                  setSource('')
                  setPage(1)
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {seniority && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Seniority: {seniorityLabel}
              <button
                type="button"
                onClick={() => {
                  setSeniority('')
                  setPage(1)
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {data && data.total === 0 && !hasActiveFilters ? (
        <EmptyState
          description="No candidates yet"
          actionLabel={CAN_WRITE.includes(role) ? 'Add Candidate' : undefined}
          onAction={undefined}
        />
      ) : (
        <CandidateTable
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          loading={isLoading}
          sortKey={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
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
    </div>
  )
}

'use client'

import { Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import type { Candidate, CandidateAiProfile } from '@/lib/types/database'
import { formatDate, formatFullName } from '@/lib/utils/format'
import Link from 'next/link'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE, CAN_ADMIN } from '@/lib/utils/constants'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function getSeniority(years: number | null | undefined): { label: string; cls: string } | null {
  if (years == null) return null
  if (years <= 2) return { label: 'Junior', cls: 'bg-slate-100 text-slate-600' }
  if (years <= 5) return { label: 'Mid-level', cls: 'bg-blue-50 text-blue-700' }
  if (years <= 9) return { label: 'Senior', cls: 'bg-violet-50 text-violet-700' }
  if (years <= 14) return { label: 'Staff', cls: 'bg-amber-50 text-amber-700' }
  return { label: 'Principal', cls: 'bg-emerald-50 text-emerald-700' }
}

interface CandidateTableProps {
  data: Candidate[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  sortKey?: string | null
  sortDir?: 'asc' | 'desc' | null
  onPageChange: (page: number, pageSize: number) => void
  onSort?: (key: string) => void
  onDelete: (id: string) => void
}

export function CandidateTable({
  data,
  total,
  page,
  pageSize,
  loading,
  sortKey,
  sortDir,
  onPageChange,
  onSort,
  onDelete,
}: CandidateTableProps) {
  const { workspace, role } = useWorkspace()
  const base = `/w/${workspace.slug}`

  const getAiProfile = (record: Candidate): CandidateAiProfile | null =>
    record.ai_profile as CandidateAiProfile | null

  const columns: DataTableColumn<Candidate>[] = [
    {
      key: 'name',
      title: 'Full Name',
      sortable: true,
      sortKey: 'first_name',
      render: (_: unknown, record: Candidate) => (
        <Link
          href={`${base}/candidates/${record.id}`}
          className="text-primary hover:underline font-medium"
        >
          {formatFullName(record.first_name, record.last_name)}
        </Link>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
      dataIndex: 'email',
      render: (email: string | null) => email || '-',
    },
    {
      key: 'job_title',
      title: 'Job Title',
      className: 'w-[180px] overflow-hidden',
      render: (_: unknown, record: Candidate) => {
        const profile = getAiProfile(record)
        const title = profile?.experience?.[0]?.title
        if (!title) return '-'
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate">{title}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px]">
              {title}
            </TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      key: 'seniority',
      title: 'Seniority',
      render: (_: unknown, record: Candidate) => {
        const profile = getAiProfile(record)
        const seniority = getSeniority(profile?.total_years_experience)
        if (!seniority) return '-'
        return (
          <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${seniority.cls}`}>
            {seniority.label}
          </span>
        )
      },
    },
    {
      key: 'location',
      title: 'Location',
      className: 'w-[120px] overflow-hidden',
      render: (_: unknown, record: Candidate) => {
        const profile = getAiProfile(record)
        const location = profile?.location
        if (!location) return '-'
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate">{location}</span>
            </TooltipTrigger>
            <TooltipContent side="top">{location}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      key: 'phone',
      title: 'Phone',
      dataIndex: 'phone',
      render: (phone: string | null) => phone || '-',
    },
    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      dataIndex: 'created_at',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'actions',
      title: '',
      width: 48,
      render: (_: unknown, record: Candidate) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={`${base}/candidates/${record.id}`}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                View
              </Link>
            </DropdownMenuItem>
            {CAN_WRITE.includes(role) && (
              <DropdownMenuItem asChild>
                <Link href={`${base}/candidates/${record.id}/edit`}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </DropdownMenuItem>
            )}
            {CAN_ADMIN.includes(role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(record.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      tableFixed
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: onPageChange,
        showSizeChanger: true,
      }}
    />
  )
}

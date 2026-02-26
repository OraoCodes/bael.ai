'use client'

import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { Candidate } from '@/lib/types/database'
import { formatDate, formatFullName } from '@/lib/utils/format'
import Link from 'next/link'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE, CAN_ADMIN } from '@/lib/utils/constants'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CandidateTableProps {
  data: Candidate[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (page: number, pageSize: number) => void
  onDelete: (id: string) => void
}

export function CandidateTable({
  data,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onDelete,
}: CandidateTableProps) {
  const { workspace, role } = useWorkspace()
  const base = `/w/${workspace.slug}`

  const columns: DataTableColumn<Candidate>[] = [
    {
      key: 'name',
      title: 'Name',
      render: (_: unknown, record: Candidate) => (
        <Link
          href={`${base}/candidates/${record.id}`}
          className="text-primary hover:underline"
        >
          {formatFullName(record.first_name, record.last_name)}
        </Link>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      dataIndex: 'email',
      render: (email: string | null) => email || '-',
    },
    {
      key: 'phone',
      title: 'Phone',
      dataIndex: 'phone',
      render: (phone: string | null) => phone || '-',
    },
    {
      key: 'source',
      title: 'Source',
      dataIndex: 'source',
      render: (source: string | null) => source || '-',
    },
    {
      key: 'tags',
      title: 'Tags',
      dataIndex: 'tags',
      render: (tags: string[]) =>
        tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null,
    },
    {
      key: 'created_at',
      title: 'Created',
      dataIndex: 'created_at',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'actions',
      title: '',
      render: (_: unknown, record: Candidate) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`${base}/candidates/${record.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>

          {CAN_WRITE.includes(role) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`${base}/candidates/${record.id}/edit`}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          )}

          {CAN_ADMIN.includes(role) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(record.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
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

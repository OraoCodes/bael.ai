'use client'

import { Eye, Pencil, Trash2, LayoutGrid, Bot } from 'lucide-react'
import type { Job, JobStatus } from '@/lib/types/database'
import { formatDate, formatSalary } from '@/lib/utils/format'
import { JobStatusBadge } from './job-status-badge'
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

interface JobTableProps {
  data: Job[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (page: number, pageSize: number) => void
  onDelete: (id: string) => void
}

export function JobTable({
  data,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onDelete,
}: JobTableProps) {
  const { workspace, role } = useWorkspace()
  const base = `/w/${workspace.slug}`

  const columns: DataTableColumn<Job>[] = [
    {
      key: 'title',
      title: 'Title',
      dataIndex: 'title',
      render: (title: string, record: Job) => (
        <Link href={`${base}/jobs/${record.id}`} className="text-primary hover:underline">
          {title}
        </Link>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      render: (status: JobStatus) => <JobStatusBadge status={status} />,
    },
    {
      key: 'department',
      title: 'Department',
      dataIndex: 'department',
      render: (dept: string | null) => dept || '-',
    },
    {
      key: 'location',
      title: 'Location',
      dataIndex: 'location',
      render: (loc: string | null) => loc || '-',
    },
    {
      key: 'salary',
      title: 'Salary',
      render: (_: unknown, record: Job) =>
        formatSalary(record.salary_min, record.salary_max, record.salary_currency),
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
      render: (_: unknown, record: Job) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`${base}/jobs/${record.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`${base}/jobs/${record.id}/pipeline`}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Pipeline</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`${base}/jobs/${record.id}/ai-match`}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Bot className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>AI Match</TooltipContent>
          </Tooltip>

          {CAN_WRITE.includes(role) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`${base}/jobs/${record.id}/edit`}>
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

'use client'

import { Check, X, AlertTriangle, Bell, Mail, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ScheduledAction, ScheduledActionType, ScheduledActionStatus } from '@/lib/types/database'
import {
  ACTION_TYPE_LABELS,
  ACTION_STATUS_LABELS,
  ACTION_STATUS_COLORS,
} from '@/lib/utils/constants'
import { formatDateTime } from '@/lib/utils/format'
import { useCancelScheduledAction, useCompleteScheduledAction } from '@/lib/queries/scheduled-actions'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import dayjs from 'dayjs'

const TYPE_ICONS: Record<ScheduledActionType, React.ReactNode> = {
  reminder: <Bell className="h-4 w-4" />,
  follow_up_email: <Mail className="h-4 w-4" />,
  stagnation_check: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  custom: null,
}

interface ActionsTableProps {
  data: ScheduledAction[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (page: number, pageSize: number) => void
}

export function ActionsTable({
  data,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
}: ActionsTableProps) {
  const cancel = useCancelScheduledAction()
  const complete = useCompleteScheduledAction()

  const handleCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id)
      toast.success('Action cancelled')
    } catch {
      toast.error('Failed to cancel action')
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await complete.mutateAsync(id)
      toast.success('Marked as complete')
    } catch {
      toast.error('Failed to complete action')
    }
  }

  const columns: DataTableColumn<ScheduledAction>[] = [
    {
      key: 'action_type',
      title: 'Type',
      dataIndex: 'action_type',
      render: (value: unknown) => {
        const type = value as ScheduledActionType
        return (
          <div className="flex items-center gap-2">
            {TYPE_ICONS[type]}
            <span>{ACTION_TYPE_LABELS[type]}</span>
          </div>
        )
      },
    },
    {
      key: 'title',
      title: 'Title',
      render: (_: unknown, record: ScheduledAction) => (
        <div>
          <div className="font-medium">{record.title}</div>
          {record.description && (
            <div className="text-xs text-muted-foreground">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'due_at',
      title: 'Due',
      dataIndex: 'due_at',
      render: (value: unknown, record: ScheduledAction) => {
        const date = value as string
        const isOverdue = record.status === 'pending' && dayjs(date).isBefore(dayjs())
        return (
          <span className={cn('flex items-center gap-1', isOverdue && 'text-destructive')}>
            {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {formatDateTime(date)}
          </span>
        )
      },
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      render: (value: unknown) => {
        const status = value as ScheduledActionStatus
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              ACTION_STATUS_COLORS[status]
            )}
          >
            {ACTION_STATUS_LABELS[status]}
          </span>
        )
      },
    },
    {
      key: 'actions',
      title: '',
      render: (_: unknown, record: ScheduledAction) => {
        if (record.status !== 'pending') return null
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleComplete(record.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark complete</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleCancel(record.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancel</TooltipContent>
            </Tooltip>
          </div>
        )
      },
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

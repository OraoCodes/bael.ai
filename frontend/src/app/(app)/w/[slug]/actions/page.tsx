'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { ActionsTable } from '@/components/actions/actions-table'
import { CreateReminderModal } from '@/components/actions/create-reminder-modal'
import { useScheduledActions } from '@/lib/queries/scheduled-actions'
import type { ScheduledActionStatus } from '@/lib/types/database'

const STATUS_TABS: { key: ScheduledActionStatus | ''; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function ActionsPage() {
  const [statusFilter, setStatusFilter] = useState<ScheduledActionStatus | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [reminderOpen, setReminderOpen] = useState(false)

  const { data, isLoading } = useScheduledActions({
    status: statusFilter,
    page,
    pageSize,
  })

  return (
    <>
      <PageHeader
        title="Scheduled Actions"
        extra={
          <Button onClick={() => setReminderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Reminder
          </Button>
        }
      />

      <Tabs
        value={statusFilter || ''}
        onValueChange={(key) => {
          setStatusFilter(key ? (key as ScheduledActionStatus) : undefined)
          setPage(1)
        }}
      >
        <TabsList variant="line" className="mb-4">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ActionsTable
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        onPageChange={(p, ps) => { setPage(p); setPageSize(ps) }}
      />

      <CreateReminderModal open={reminderOpen} onClose={() => setReminderOpen(false)} />
    </>
  )
}

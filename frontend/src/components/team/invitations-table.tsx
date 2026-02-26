'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import type { InvitationWithInviter } from '@/lib/types/database'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/utils/constants'
import { formatDate } from '@/lib/utils/format'
import { useRevokeInvitation } from '@/lib/queries/team'

interface InvitationsTableProps {
  data: InvitationWithInviter[]
  loading: boolean
}

export function InvitationsTable({ data, loading }: InvitationsTableProps) {
  const revoke = useRevokeInvitation()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleRevoke = async () => {
    if (!confirmId) return
    try {
      await revoke.mutateAsync(confirmId)
      toast.success('Invitation revoked')
    } catch {
      toast.error('Failed to revoke invitation')
    } finally {
      setConfirmId(null)
    }
  }

  const columns: DataTableColumn<InvitationWithInviter>[] = [
    {
      key: 'email',
      title: 'Email',
      dataIndex: 'email',
    },
    {
      key: 'role',
      title: 'Role',
      dataIndex: 'role',
      render: (role: string) => (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            ROLE_COLORS[role as keyof typeof ROLE_COLORS]
          )}
        >
          {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
        </span>
      ),
    },
    {
      key: 'invited_by',
      title: 'Invited By',
      render: (_: unknown, record: InvitationWithInviter) =>
        record.users?.full_name || record.users?.email || '-',
    },
    {
      key: 'expires_at',
      title: 'Expires',
      dataIndex: 'expires_at',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'actions',
      title: '',
      render: (_: unknown, record: InvitationWithInviter) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-7 text-xs"
          onClick={() => setConfirmId(record.id)}
        >
          Revoke
        </Button>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation link will become invalid immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

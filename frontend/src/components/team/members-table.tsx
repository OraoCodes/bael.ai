'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type { WorkspaceMembershipWithUser, WorkspaceRole } from '@/lib/types/database'
import { ROLE_LABELS, ROLE_COLORS, CAN_ADMIN } from '@/lib/utils/constants'
import { formatDate, getInitials } from '@/lib/utils/format'
import { useUpdateRole, useRemoveMember } from '@/lib/queries/team'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useAuth } from '@/components/providers/auth-provider'

const EDITABLE_ROLES: { label: string; value: WorkspaceRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Recruiter', value: 'recruiter' },
  { label: 'Viewer', value: 'viewer' },
]

interface MembersTableProps {
  data: WorkspaceMembershipWithUser[]
  loading: boolean
}

export function MembersTable({ data, loading }: MembersTableProps) {
  const { role: myRole } = useWorkspace()
  const { user } = useAuth()
  const updateRole = useUpdateRole()
  const removeMember = useRemoveMember()

  const [confirmRemove, setConfirmRemove] = useState<{
    membershipId: string
    isMe: boolean
  } | null>(null)

  const canAdmin = CAN_ADMIN.includes(myRole)

  const handleRoleChange = async (membershipId: string, newRole: WorkspaceRole) => {
    try {
      await updateRole.mutateAsync({ membershipId, role: newRole })
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleRemove = async () => {
    if (!confirmRemove) return
    try {
      await removeMember.mutateAsync(confirmRemove.membershipId)
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setConfirmRemove(null)
    }
  }

  const columns: DataTableColumn<WorkspaceMembershipWithUser>[] = [
    {
      key: 'member',
      title: 'Member',
      render: (_: unknown, record: WorkspaceMembershipWithUser) => {
        const u = record.users
        const name = u.full_name || u.email
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {u.avatar_url && <AvatarImage src={u.avatar_url} alt={name} />}
              <AvatarFallback>
                {u.avatar_url ? <User className="h-4 w-4" /> : getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{name}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'role',
      title: 'Role',
      render: (_: unknown, record: WorkspaceMembershipWithUser) => {
        const isOwner = record.role === 'owner'
        const isMe = record.user_id === user?.id

        if (!canAdmin || isOwner || isMe) {
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                ROLE_COLORS[record.role]
              )}
            >
              {ROLE_LABELS[record.role]}
            </span>
          )
        }

        return (
          <Select
            value={record.role}
            onValueChange={(value) => handleRoleChange(record.id, value as WorkspaceRole)}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      key: 'created_at',
      title: 'Joined',
      dataIndex: 'created_at',
      render: (date: string) => formatDate(date),
    },
    {
      key: 'actions',
      title: '',
      render: (_: unknown, record: WorkspaceMembershipWithUser) => {
        const isOwner = record.role === 'owner'
        const isMe = record.user_id === user?.id

        if (isOwner && myRole !== 'owner') return null
        if (!canAdmin && !isMe) return null

        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-7 text-xs"
            onClick={() => setConfirmRemove({ membershipId: record.id, isMe })}
          >
            {isMe ? 'Leave' : 'Remove'}
          </Button>
        )
      },
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

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRemove?.isMe ? 'Leave workspace?' : 'Remove this member?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.isMe
                ? 'You will lose access to this workspace.'
                : 'This member will be removed from the workspace.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              {confirmRemove?.isMe ? 'Leave' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

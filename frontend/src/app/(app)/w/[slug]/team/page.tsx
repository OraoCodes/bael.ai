'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { MembersTable } from '@/components/team/members-table'
import { InvitationsTable } from '@/components/team/invitations-table'
import { InviteModal } from '@/components/team/invite-modal'
import { useMembers, useInvitations } from '@/lib/queries/team'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_ADMIN } from '@/lib/utils/constants'

export default function TeamPage() {
  const { role } = useWorkspace()
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: members, isLoading: membersLoading } = useMembers()
  const { data: invitations, isLoading: invitationsLoading } = useInvitations()

  return (
    <>
      <PageHeader
        title="Team"
        extra={
          CAN_ADMIN.includes(role) && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )
        }
      />

      <Tabs defaultValue="members">
        <TabsList variant="line">
          <TabsTrigger value="members">Members ({members?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitations?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersTable data={members ?? []} loading={membersLoading} />
        </TabsContent>
        <TabsContent value="invitations">
          <InvitationsTable data={invitations ?? []} loading={invitationsLoading} />
        </TabsContent>
      </Tabs>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  )
}

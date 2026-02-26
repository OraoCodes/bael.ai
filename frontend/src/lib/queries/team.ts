import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { WorkspaceMembershipWithUser, InvitationWithInviter, WorkspaceRole } from '@/lib/types/database'

export const teamKeys = {
  all: (wsId: string) => ['team', wsId] as const,
  members: (wsId: string) => [...teamKeys.all(wsId), 'members'] as const,
  invitations: (wsId: string) => [...teamKeys.all(wsId), 'invitations'] as const,
}

export function useMembers() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: teamKeys.members(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_memberships')
        .select('*, users(*)')
        .eq('workspace_id', workspaceId)
        .order('created_at')
      if (error) throw error
      return data as WorkspaceMembershipWithUser[]
    },
  })
}

export function useInvitations() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: teamKeys.invitations(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, users(*)')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InvitationWithInviter[]
    },
  })
}

export function useInviteMember() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: WorkspaceRole }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          invited_by: user!.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(workspaceId) })
    },
  })
}

export function useRevokeInvitation() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(workspaceId) })
    },
  })
}

export function useUpdateRole() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_memberships')
        .update({ role })
        .eq('id', membershipId)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(workspaceId) })
    },
  })
}

export function useRemoveMember() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('workspace_memberships')
        .delete()
        .eq('id', membershipId)
        .eq('workspace_id', workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(workspaceId) })
    },
  })
}

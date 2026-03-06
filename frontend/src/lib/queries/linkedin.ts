import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'

export const linkedinKeys = {
  link: (wsId: string) => ['linkedin-link', wsId] as const,
  shares: (wsId: string, jobId: string) => ['linkedin-shares', wsId, jobId] as const,
}

export function useLinkedInLink() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: linkedinKeys.link(workspaceId),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from('linkedin_links')
        .select('id, linkedin_profile_id, linkedin_name, token_expires_at, linked_at')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .is('unlinked_at', null)
        .maybeSingle()

      return data
    },
  })
}

export function useConnectLinkedIn() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID
      if (!clientId) throw new Error('LinkedIn client ID not configured')

      const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/linkedin-oauth-callback`

      // Encode state with user context
      const state = btoa(
        JSON.stringify({
          user_id: user.id,
          workspace_id: workspaceId,
          redirect_url: window.location.href.split('?')[0],
        })
      )

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: 'openid profile w_member_social',
      })

      // Redirect to LinkedIn OAuth
      window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`
    },
  })
}

export function useUnlinkLinkedIn() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('linkedin_links')
        .update({ unlinked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .is('unlinked_at', null)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.link(workspaceId),
      })
    },
  })
}

export function useShareJobToLinkedIn() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/share-job-to-linkedin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ job_id: jobId, workspace_id: workspaceId }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to share on LinkedIn')
      }
      return res.json() as Promise<{ success: boolean; linkedin_post_id: string | null }>
    },
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.shares(workspaceId, jobId),
      })
    },
  })
}

export function useLinkedInShares(jobId: string) {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: linkedinKeys.shares(workspaceId, jobId),
    queryFn: async () => {
      const { data } = await supabase
        .from('linkedin_shares')
        .select('id, shared_by, linkedin_post_id, shared_at')
        .eq('job_id', jobId)
        .eq('workspace_id', workspaceId)
        .order('shared_at', { ascending: false })

      return data ?? []
    },
    enabled: !!jobId,
  })
}

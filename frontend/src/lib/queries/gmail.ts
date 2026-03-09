import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'

export const gmailKeys = {
  link: (wsId: string) => ['gmail-link', wsId] as const,
  ingestionLogs: (wsId: string) => ['gmail-ingestion-logs', wsId] as const,
}

export function useGmailLink() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: gmailKeys.link(workspaceId),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from('gmail_links')
        .select('id, gmail_address, sync_enabled, last_synced_at, last_error, token_expires_at, linked_at')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .is('unlinked_at', null)
        .maybeSingle()

      return data
    },
  })
}

export function useConnectGmail() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_GMAIL_CLIENT_ID
      if (!clientId) throw new Error('Google client ID not configured')

      const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gmail-oauth-callback`

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
        scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      })

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    },
  })
}

export function useUnlinkGmail() {
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
        .from('gmail_links')
        .update({ unlinked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .is('unlinked_at', null)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.link(workspaceId) })
    },
  })
}

export function useToggleGmailSync() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ linkId, enabled }: { linkId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('gmail_links')
        .update({ sync_enabled: enabled, last_error: null, updated_at: new Date().toISOString() })
        .eq('id', linkId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.link(workspaceId) })
    },
  })
}

export function useSyncGmailNow() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-inbound-emails`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to sync emails')
      }
      return res.json() as Promise<{ processed: number; failed: number; links: number }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.link(workspaceId) })
      queryClient.invalidateQueries({ queryKey: gmailKeys.ingestionLogs(workspaceId) })
    },
  })
}

export function useIngestionLogs() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: gmailKeys.ingestionLogs(workspaceId),
    queryFn: async () => {
      const { data } = await supabase
        .from('email_ingestion_logs')
        .select('id, from_email, from_name, subject, status, candidate_id, job_id, ai_match_confidence, processed_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50)

      return data ?? []
    },
  })
}

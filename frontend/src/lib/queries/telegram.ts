import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'

export const telegramKeys = {
  link: (wsId: string) => ['telegram-link', wsId] as const,
}

export function useTelegramLink() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: telegramKeys.link(workspaceId),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from('telegram_links')
        .select('id, telegram_username, linked_at')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .is('unlinked_at', null)
        .maybeSingle()

      return data
    },
  })
}

export function useGenerateTelegramCode() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-telegram-link-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ workspace_id: workspaceId }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to generate code')
      }
      return res.json() as Promise<{ code: string; expires_at: string }>
    },
  })
}

export function useUnlinkTelegram() {
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
        .from('telegram_links')
        .update({ unlinked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .is('unlinked_at', null)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: telegramKeys.link(workspaceId),
      })
    },
  })
}

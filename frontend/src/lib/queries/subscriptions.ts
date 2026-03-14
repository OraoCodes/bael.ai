import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'

export interface SubscriptionPlan {
  id: string
  name: string
  stripe_price_id: string
  price_cents: number
  currency: string
  candidate_limit: number | null
  team_member_limit: number | null
  features: Record<string, boolean | number | null>
  position: number
  active: boolean
}

export interface WorkspaceSubscription {
  id: string
  workspace_id: string
  plan_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused'
  trial_starts_at: string
  trial_ends_at: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  grace_period_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceUsage {
  workspace_id: string
  candidate_count: number
  updated_at: string
}

export const subscriptionQueryKeys = {
  subscription: (wsId: string) => ['subscription', wsId] as const,
  plans: () => ['subscription-plans'] as const,
  usage: (wsId: string) => ['workspace-usage', wsId] as const,
  billingEvents: (wsId: string) => ['billing-events', wsId] as const,
}

export function useSubscription() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: subscriptionQueryKeys.subscription(workspaceId),
    queryFn: async () => {
      const [subRes, usageRes] = await Promise.all([
        supabase
          .from('workspace_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('workspace_id', workspaceId)
          .single(),
        supabase
          .from('workspace_usage')
          .select('*')
          .eq('workspace_id', workspaceId)
          .single(),
      ])

      if (subRes.error && subRes.error.code !== 'PGRST116') throw subRes.error

      const subscription = subRes.data as (WorkspaceSubscription & { subscription_plans: SubscriptionPlan }) | null
      const usage = usageRes.data as WorkspaceUsage | null

      return { subscription, plan: subscription?.subscription_plans ?? null, usage }
    },
    staleTime: 60_000,
  })
}

export function useSubscriptionPlans() {
  const supabase = createClient()

  return useQuery({
    queryKey: subscriptionQueryKeys.plans(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('position')
      if (error) throw error
      return data as SubscriptionPlan[]
    },
    staleTime: 5 * 60_000,
  })
}

export function useBillingEvents() {
  const { workspaceId } = useWorkspace()
  const supabase = createClient()

  return useQuery({
    queryKey: subscriptionQueryKeys.billingEvents(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })
}

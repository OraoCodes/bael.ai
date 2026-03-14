'use client'

import { createContext, useContext, useMemo } from 'react'
import { useSubscription as useSubscriptionQuery } from '@/lib/queries/subscriptions'
import type { WorkspaceSubscription, SubscriptionPlan, WorkspaceUsage } from '@/lib/queries/subscriptions'

interface SubscriptionContextType {
  subscription: WorkspaceSubscription | null
  plan: SubscriptionPlan | null
  usage: WorkspaceUsage | null
  isLoading: boolean
  // Status helpers
  isTrialing: boolean
  isActive: boolean
  isPastDue: boolean
  isExpired: boolean
  isReadOnly: boolean         // expired + no grace period left
  inGracePeriod: boolean      // expired/canceled but grace still active
  // Trial
  trialDaysLeft: number | null
  trialEndsAt: Date | null
  // Usage
  candidateCount: number
  candidateLimit: number | null
  usagePercent: number
  canAddCandidate: boolean
  isNearLimit: boolean        // >= 80%
  isAtLimit: boolean          // >= 100%
  // Features
  hasFeature: (feature: string) => boolean
}

const SubscriptionContext = createContext<SubscriptionContextType>(null!)

export const useSubscriptionContext = () => useContext(SubscriptionContext)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useSubscriptionQuery()

  const value = useMemo<SubscriptionContextType>(() => {
    const subscription = data?.subscription ?? null
    const plan = data?.plan ?? null
    const usage = data?.usage ?? null
    const now = new Date()

    const status = subscription?.status ?? null
    const isTrialing = status === 'trialing'
    const isActive = status === 'active'
    const isPastDue = status === 'past_due'
    const isExpired = status === 'expired' || status === 'canceled'

    const gracePeriodEnd = subscription?.grace_period_ends_at
      ? new Date(subscription.grace_period_ends_at)
      : null
    const inGracePeriod = isExpired && gracePeriodEnd !== null && gracePeriodEnd > now
    const isReadOnly = isExpired && !inGracePeriod

    // Trial countdown
    let trialDaysLeft: number | null = null
    let trialEndsAt: Date | null = null
    if (isTrialing && subscription?.trial_ends_at) {
      trialEndsAt = new Date(subscription.trial_ends_at)
      const msLeft = trialEndsAt.getTime() - now.getTime()
      trialDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
    }

    // Usage
    const candidateCount = usage?.candidate_count ?? 0
    const candidateLimit = plan?.candidate_limit ?? null
    const usagePercent = candidateLimit ? Math.round((candidateCount / candidateLimit) * 100) : 0
    const isNearLimit = candidateLimit !== null && usagePercent >= 80
    const isAtLimit = candidateLimit !== null && candidateCount >= candidateLimit

    const isSubscriptionActive = isTrialing || isActive || isPastDue
    const canAddCandidate = isSubscriptionActive && !isAtLimit

    const hasFeature = (feature: string): boolean => {
      if (!plan) return false
      if (plan.candidate_limit === null) return true // enterprise
      return Boolean(plan.features?.[feature])
    }

    return {
      subscription,
      plan,
      usage,
      isLoading,
      isTrialing,
      isActive,
      isPastDue,
      isExpired,
      isReadOnly,
      inGracePeriod,
      trialDaysLeft,
      trialEndsAt,
      candidateCount,
      candidateLimit,
      usagePercent,
      canAddCandidate,
      isNearLimit,
      isAtLimit,
      hasFeature,
    }
  }, [data, isLoading])

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

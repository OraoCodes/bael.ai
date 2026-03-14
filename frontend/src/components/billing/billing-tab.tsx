'use client'

import { useState } from 'react'
import { Check, CreditCard, Zap, Building2, Sparkles, ExternalLink, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useSubscriptionContext } from '@/components/providers/subscription-provider'
import { useSubscriptionPlans, useBillingEvents } from '@/lib/queries/subscriptions'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { SubscriptionPlan } from '@/lib/queries/subscriptions'

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="h-5 w-5" />,
  pro: <Sparkles className="h-5 w-5" />,
  enterprise: <Building2 className="h-5 w-5" />,
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-zinc-100 text-zinc-600',
  pro: 'bg-blue-100 text-blue-600',
  enterprise: 'bg-violet-100 text-violet-600',
}

const FEATURE_LABELS: Record<string, string> = {
  ai_matching: 'AI Candidate Matching',
  ai_search: 'AI-Powered Search',
  gmail_integration: 'Gmail Integration',
  linkedin_integration: 'LinkedIn Integration',
  telegram_integration: 'Telegram Notifications',
  advanced_analytics: 'Advanced Analytics',
  custom_pipeline: 'Custom Pipeline Stages',
  public_board: 'Public Careers Board',
  api_access: 'API Access',
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BillingTab() {
  const { workspaceId, workspace, role } = useWorkspace()
  const {
    subscription, plan, isLoading,
    isTrialing, isActive, isPastDue, isExpired,
    trialDaysLeft, trialEndsAt,
    candidateCount, candidateLimit, usagePercent,
  } = useSubscriptionContext()
  const { data: plans } = useSubscriptionPlans()
  const { data: billingEvents } = useBillingEvents()
  const supabase = createClient()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const isOwnerOrAdmin = ['owner', 'admin'].includes(role)

  const statusLabel = {
    trialing: 'Free Trial',
    active: 'Active',
    past_due: 'Past Due',
    expired: 'Expired',
    canceled: 'Canceled',
    paused: 'Paused',
  }

  const statusColor = {
    trialing: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    past_due: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
    canceled: 'bg-zinc-100 text-zinc-600',
    paused: 'bg-zinc-100 text-zinc-600',
  }

  const handleSubscribe = async (planId: string) => {
    if (!isOwnerOrAdmin) {
      toast.error('Only owners and admins can manage billing')
      return
    }
    setCheckoutLoading(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('create-checkout-session', {
        body: { workspace_id: workspaceId, plan_id: planId },
      })
      if (res.error) throw res.error
      if (res.data?.upgraded) {
        toast.success('Plan updated!')
      } else if (res.data?.url) {
        window.location.href = res.data.url
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to start checkout')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageBilling = async () => {
    if (!isOwnerOrAdmin) return
    setPortalLoading(true)
    try {
      const res = await supabase.functions.invoke('create-portal-session', {
        body: { workspace_id: workspaceId },
      })
      if (res.error) throw res.error
      if (res.data?.url) window.location.href = res.data.url
    } catch (err) {
      toast.error((err as Error).message || 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading billing info…</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', PLAN_COLORS[plan?.id ?? 'starter'])}>
                {PLAN_ICONS[plan?.id ?? 'starter']}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">{plan?.name ?? 'Starter'}</span>
                  {subscription?.status && (
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', statusColor[subscription.status])}>
                      {statusLabel[subscription.status]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isTrialing && trialDaysLeft !== null && (
                    <>Trial ends {formatDate(subscription?.trial_ends_at ?? null)} · {trialDaysLeft} days left</>
                  )}
                  {isActive && subscription?.current_period_end && (
                    <>Renews {formatDate(subscription.current_period_end)}</>
                  )}
                  {isPastDue && 'Payment failed — please update payment method'}
                  {isExpired && 'Subscription ended'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold">{plan ? formatPrice(plan.price_cents) : '$0'}</p>
              <p className="text-xs text-muted-foreground">/ month</p>
            </div>
          </div>

          {/* Usage bar */}
          {candidateLimit !== null && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Candidates</span>
                <span className={cn('font-medium', usagePercent >= 100 ? 'text-red-600' : usagePercent >= 80 ? 'text-amber-600' : 'text-zinc-700')}>
                  {candidateCount} / {candidateLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </div>
          )}
          {candidateLimit === null && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-violet-500" />
              <span>Unlimited candidates</span>
            </div>
          )}

          {/* Actions */}
          {isOwnerOrAdmin && (
            <div className="mt-5 flex gap-2">
              {subscription?.stripe_customer_id && (
                <Button variant="outline" size="sm" className="rounded-lg" onClick={handleManageBilling} disabled={portalLoading}>
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  {portalLoading ? 'Loading…' : 'Manage Billing'}
                  <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {(plans ?? []).map((p: SubscriptionPlan) => {
              const isCurrent = plan?.id === p.id
              const isEnterprise = p.id === 'enterprise'

              return (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-xl border p-4 flex flex-col gap-4 relative',
                    isCurrent ? 'border-blue-500 bg-blue-50/40' : 'border-zinc-200 bg-white'
                  )}
                >
                  {isCurrent && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">CURRENT</span>
                    </div>
                  )}

                  <div>
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-3', PLAN_COLORS[p.id])}>
                      {PLAN_ICONS[p.id]}
                    </div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-2xl font-bold mt-0.5">{formatPrice(p.price_cents)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                  </div>

                  <ul className="space-y-1.5 flex-1">
                    <li className="flex items-center gap-2 text-xs text-zinc-600">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {p.candidate_limit === null ? 'Unlimited candidates' : `${p.candidate_limit} candidates`}
                    </li>
                    <li className="flex items-center gap-2 text-xs text-zinc-600">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {p.team_member_limit === null ? 'Unlimited team members' : `${p.team_member_limit} team members`}
                    </li>
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                      const has = Boolean(p.features?.[key])
                      if (!has) return null
                      return (
                        <li key={key} className="flex items-center gap-2 text-xs text-zinc-600">
                          <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          {label}
                        </li>
                      )
                    })}
                  </ul>

                  {isOwnerOrAdmin && !isCurrent && (
                    <Button
                      size="sm"
                      className={cn(
                        'rounded-lg w-full',
                        isEnterprise ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'
                      )}
                      onClick={() => handleSubscribe(p.id)}
                      disabled={checkoutLoading === p.id}
                    >
                      {checkoutLoading === p.id ? 'Loading…' : isEnterprise ? 'Contact Sales' : 'Upgrade'}
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            All plans include a 30-day free trial. Cancel anytime.
          </p>
        </CardContent>
      </Card>

      {/* Billing history */}
      {isOwnerOrAdmin && billingEvents && billingEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {billingEvents.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium capitalize">{ev.event_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</p>
                  </div>
                  {ev.metadata?.amount_paid && (
                    <p className="text-sm font-semibold">${((ev.metadata.amount_paid as number) / 100).toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

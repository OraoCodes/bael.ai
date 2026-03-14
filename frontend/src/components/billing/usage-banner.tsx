'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, CreditCard, X } from 'lucide-react'
import { useState } from 'react'
import { useSubscriptionContext } from '@/components/providers/subscription-provider'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { cn } from '@/lib/utils'

export function UsageBanner() {
  const { workspace } = useWorkspace()
  const {
    isLoading,
    isTrialing,
    isExpired,
    isReadOnly,
    inGracePeriod,
    isPastDue,
    trialDaysLeft,
    isNearLimit,
    isAtLimit,
    candidateCount,
    candidateLimit,
    usagePercent,
  } = useSubscriptionContext()

  const [dismissed, setDismissed] = useState(false)
  const billingHref = `/w/${workspace.slug}/settings?tab=billing`

  if (isLoading || dismissed) return null

  // Priority order: read-only > past_due > grace period > trial expiring > near limit

  if (isReadOnly) {
    return (
      <Banner variant="error" icon={<AlertTriangle className="h-4 w-4" />}>
        Your workspace is locked.{' '}
        <Link href={billingHref} className="font-semibold underline underline-offset-2">Subscribe now</Link>
        {' '}to restore access to all features.
      </Banner>
    )
  }

  if (inGracePeriod) {
    return (
      <Banner variant="warning" icon={<AlertTriangle className="h-4 w-4" />} onDismiss={() => setDismissed(true)}>
        Your subscription has ended — workspace is in read-only mode.{' '}
        <Link href={billingHref} className="font-semibold underline underline-offset-2">Reactivate now</Link>
        {' '}to continue.
      </Banner>
    )
  }

  if (isPastDue) {
    return (
      <Banner variant="warning" icon={<CreditCard className="h-4 w-4" />} onDismiss={() => setDismissed(true)}>
        Payment failed — please{' '}
        <Link href={billingHref} className="font-semibold underline underline-offset-2">update your payment method</Link>
        {' '}to avoid interruption.
      </Banner>
    )
  }

  if (isTrialing && trialDaysLeft !== null && trialDaysLeft <= 7) {
    const urgent = trialDaysLeft <= 3
    return (
      <Banner variant={urgent ? 'warning' : 'info'} icon={<Clock className="h-4 w-4" />} onDismiss={() => setDismissed(true)}>
        {trialDaysLeft === 0
          ? 'Your free trial ends today.'
          : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}.`}{' '}
        <Link href={billingHref} className="font-semibold underline underline-offset-2">Add a payment method</Link>
        {' '}to keep going.
      </Banner>
    )
  }

  if (isAtLimit && candidateLimit !== null) {
    return (
      <Banner variant="warning" icon={<AlertTriangle className="h-4 w-4" />} onDismiss={() => setDismissed(true)}>
        You&apos;ve reached your limit of {candidateLimit} candidates.{' '}
        <Link href={billingHref} className="font-semibold underline underline-offset-2">Upgrade your plan</Link>
        {' '}to add more.
      </Banner>
    )
  }

  if (isNearLimit && candidateLimit !== null) {
    return (
      <Banner variant="info" icon={<AlertTriangle className="h-4 w-4" />} onDismiss={() => setDismissed(true)}>
        You&apos;ve used {candidateCount} of {candidateLimit} candidates ({usagePercent}%).{' '}
        <Link href={billingHref} className="font-semibold underline underline-offset-2">Upgrade</Link>
        {' '}before you hit the limit.
      </Banner>
    )
  }

  return null
}

function Banner({
  children,
  variant,
  icon,
  onDismiss,
}: {
  children: React.ReactNode
  variant: 'info' | 'warning' | 'error'
  icon: React.ReactNode
  onDismiss?: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-2.5 text-sm',
        variant === 'error' && 'bg-red-600 text-white',
        variant === 'warning' && 'bg-amber-50 text-amber-900 border-b border-amber-200',
        variant === 'info' && 'bg-blue-50 text-blue-900 border-b border-blue-200'
      )}
    >
      <span className={cn(
        'shrink-0',
        variant === 'error' && 'text-white/90',
        variant === 'warning' && 'text-amber-600',
        variant === 'info' && 'text-blue-600',
      )}>
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            'shrink-0 rounded p-0.5 transition-colors',
            variant === 'error' && 'hover:bg-white/20',
            variant === 'warning' && 'hover:bg-amber-100 text-amber-600',
            variant === 'info' && 'hover:bg-blue-100 text-blue-600',
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

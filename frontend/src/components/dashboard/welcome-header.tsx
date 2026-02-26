'use client'

import { useAuth } from '@/components/providers/auth-provider'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function WelcomeHeader() {
  const { user } = useAuth()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  return (
    <div>
      <h2 className="text-xl font-semibold">
        {getGreeting()}, {firstName} 👋
      </h2>
      <p className="text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening with your recruitment pipeline today.
      </p>
    </div>
  )
}

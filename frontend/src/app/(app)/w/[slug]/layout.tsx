'use client'

import { useParams } from 'next/navigation'
import { WorkspaceProvider } from '@/components/providers/workspace-provider'
import { SubscriptionProvider } from '@/components/providers/subscription-provider'
import { AppSider } from '@/components/layout/app-sider'
import { AppHeader } from '@/components/layout/app-header'
import { UsageBanner } from '@/components/billing/usage-banner'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { slug } = useParams<{ slug: string }>()

  return (
    <WorkspaceProvider slug={slug}>
      <SubscriptionProvider>
        <div className="flex min-h-screen">
          <AppSider />
          <div className="flex flex-col flex-1 min-w-0">
            <AppHeader />
            <UsageBanner />
            <main className="p-6 flex-1">
              {children}
            </main>
          </div>
        </div>
      </SubscriptionProvider>
    </WorkspaceProvider>
  )
}

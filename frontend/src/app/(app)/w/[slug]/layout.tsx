'use client'

import { useParams } from 'next/navigation'
import { WorkspaceProvider } from '@/components/providers/workspace-provider'
import { AppSider } from '@/components/layout/app-sider'
import { AppHeader } from '@/components/layout/app-header'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { slug } = useParams<{ slug: string }>()

  return (
    <WorkspaceProvider slug={slug}>
      <div className="flex min-h-screen">
        <AppSider />
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader />
          <main className="p-6 flex-1">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}

'use client'

import { CreateJobModal } from '@/components/jobs/create-job-modal'

export function AppHeader() {
  return (
    <header className="flex h-12 items-center justify-end border-b border-border bg-background px-6">
      <CreateJobModal />
    </header>
  )
}

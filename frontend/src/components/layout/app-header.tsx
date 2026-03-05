'use client'

import { usePathname } from 'next/navigation'
import { CreateJobModal } from '@/components/jobs/create-job-modal'

const HIDE_CREATE_JOB_PATHS = ['/team', '/settings', '/activity', '/candidates']

export function AppHeader() {
  const pathname = usePathname()
  const showCreateJob = !HIDE_CREATE_JOB_PATHS.some((p) => pathname.endsWith(p))

  return (
    <header className="flex h-12 items-center justify-end border-b border-border bg-background px-6">
      {showCreateJob && <CreateJobModal />}
    </header>
  )
}

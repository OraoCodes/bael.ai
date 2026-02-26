'use client'

import { PageHeader } from '@/components/shared/page-header'
import { ActivityFeed } from '@/components/activity/activity-feed'

export default function ActivityPage() {
  return (
    <>
      <PageHeader title="Activity" />
      <ActivityFeed />
    </>
  )
}

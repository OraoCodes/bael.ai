'use client'

import { useParams, useRouter } from 'next/navigation'
import { Pencil, LayoutGrid, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { PageHeader } from '@/components/shared/page-header'
import { JobDetail } from '@/components/jobs/job-detail'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { useJob } from '@/lib/queries/jobs'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE } from '@/lib/utils/constants'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspace, role } = useWorkspace()
  const { data: job, isLoading, error } = useJob(id)
  const base = `/w/${workspace.slug}`

  if (isLoading) return <PageSpinner />
  if (error || !job) return <ResultView status="404" title="Job not found" />

  return (
    <>
      <PageHeader
        title={job.title}
        breadcrumbs={[
          { label: 'Jobs', href: `${base}/jobs` },
          { label: job.title },
        ]}
        extra={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`${base}/jobs/${id}/pipeline`)}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Pipeline
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`${base}/jobs/${id}/ai-match`)}
            >
              <Bot className="mr-2 h-4 w-4" />
              AI Match
            </Button>
            {CAN_WRITE.includes(role) && (
              <Button onClick={() => router.push(`${base}/jobs/${id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList variant="line">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <JobDetail job={job} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline entityType="jobs" entityId={id} />
        </TabsContent>
      </Tabs>
    </>
  )
}

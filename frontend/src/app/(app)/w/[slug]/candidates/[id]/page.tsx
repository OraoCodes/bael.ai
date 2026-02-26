'use client'

import { useParams, useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { PageHeader } from '@/components/shared/page-header'
import { CandidateDetail } from '@/components/candidates/candidate-detail'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { useCandidate } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE } from '@/lib/utils/constants'
import { formatFullName } from '@/lib/utils/format'

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspace, role } = useWorkspace()
  const { data: candidate, isLoading, error } = useCandidate(id)
  const base = `/w/${workspace.slug}`

  if (isLoading) return <PageSpinner />
  if (error || !candidate) return <ResultView status="404" title="Candidate not found" />

  return (
    <>
      <PageHeader
        title={formatFullName(candidate.first_name, candidate.last_name)}
        breadcrumbs={[
          { label: 'Candidates', href: `${base}/candidates` },
          { label: formatFullName(candidate.first_name, candidate.last_name) },
        ]}
        extra={
          CAN_WRITE.includes(role) && (
            <Button
              variant="outline"
              onClick={() => router.push(`${base}/candidates/${id}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )
        }
      />

      <Tabs defaultValue="details">
        <TabsList variant="line">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <CandidateDetail candidate={candidate} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline entityType="candidates" entityId={id} />
        </TabsContent>
      </Tabs>
    </>
  )
}

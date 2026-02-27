'use client'

import { useParams, useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { PageHeader } from '@/components/shared/page-header'
import { CandidateAiProfile } from '@/components/candidates/candidate-ai-profile'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { useCandidate } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE } from '@/lib/utils/constants'
import { formatFullName } from '@/lib/utils/format'
import type { CandidateAiProfile as AiProfileType } from '@/lib/types/database'

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { workspace, role } = useWorkspace()
  const { data: candidate, isLoading, error } = useCandidate(id)
  const base = `/w/${workspace.slug}`

  if (isLoading) return <PageSpinner />
  if (error || !candidate) return <ResultView status="404" title="Candidate not found" />

  const aiProfile = candidate.ai_profile as AiProfileType | null

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

      <Tabs defaultValue="profile">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <CandidateAiProfile
            profile={aiProfile ?? { skills: [], job_titles: [], companies: [], education: [], certifications: [], total_years_experience: null, languages: [], location: null, experience: [] }}
            summary={candidate.ai_summary}
            candidate={candidate}
          />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTimeline entityType="candidates" entityId={id} />
        </TabsContent>
      </Tabs>
    </>
  )
}

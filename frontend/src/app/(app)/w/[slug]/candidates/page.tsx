'use client'

import { Sparkles, Users } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { CreateCandidateModal } from '@/components/candidates/create-candidate-modal'
import { AiSearchTab } from '@/components/candidates/ai-search-tab'
import { AllCandidatesTab } from '@/components/candidates/all-candidates-tab'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CAN_WRITE } from '@/lib/utils/constants'

export default function CandidatesPage() {
  const { role } = useWorkspace()

  return (
    <>
      <PageHeader
        title="Candidates"
        extra={
          CAN_WRITE.includes(role) ? <CreateCandidateModal /> : undefined
        }
      />

      <Tabs defaultValue="ai-search">
        <TabsList variant="line">
          <TabsTrigger value="ai-search">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            AI Search
          </TabsTrigger>
          <TabsTrigger value="all">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            All Candidates
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ai-search">
          <AiSearchTab />
        </TabsContent>
        <TabsContent value="all">
          <AllCandidatesTab />
        </TabsContent>
      </Tabs>
    </>
  )
}

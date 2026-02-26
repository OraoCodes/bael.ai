'use client'

import { WelcomeHeader } from '@/components/dashboard/welcome-header'
import { StatsRow } from '@/components/dashboard/stats-row'
import { TopCandidatesCard } from '@/components/dashboard/top-candidates-card'
import { UpcomingInterviewsCard } from '@/components/dashboard/upcoming-interviews-card'
import { RecruitmentProgressChart } from '@/components/dashboard/recruitment-progress-chart'
import { RecruitmentStatusCard } from '@/components/dashboard/recruitment-status-card'
import { RecentActivityCard } from '@/components/dashboard/recent-activity-card'
import { OpenJobsCard } from '@/components/dashboard/open-jobs-card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <WelcomeHeader />
      <StatsRow />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left 25% — Action Center */}
        <div className="lg:col-span-1 space-y-6">
          <TopCandidatesCard />
          <UpcomingInterviewsCard />
        </div>
        {/* Center 50% — Analytics Hub */}
        <div className="lg:col-span-2 space-y-6">
          <RecruitmentProgressChart />
          <RecruitmentStatusCard />
        </div>
        {/* Right 25% — The Pulse + Hiring */}
        <div className="lg:col-span-1 space-y-6">
          <RecentActivityCard />
          <OpenJobsCard />
        </div>
      </div>
    </div>
  )
}

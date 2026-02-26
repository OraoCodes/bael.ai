'use client'

import { Briefcase, Users, UserCheck, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats } from '@/lib/queries/metrics'
import type { ReactNode } from 'react'

interface TrendPill {
  label: string
  positive: boolean
}

interface StatCardProps {
  title: string
  value: number
  icon: ReactNode
  iconBg: string
  trend?: TrendPill
  loading?: boolean
}

function StatCard({ title, value, icon, iconBg, trend, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-4xl font-bold text-foreground tracking-tight">{value}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                trend.positive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {trend.positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsRow() {
  const { data, isLoading } = useDashboardStats()

  const stages = data?.appsByStage ?? []

  const interviewedCount = stages.find(
    (s) => s.stageName.toLowerCase().includes('interview')
  )?.count ?? data?.hiredCount ?? 0

  const topStage = stages
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)[0]

  const activeJobs = data?.openJobs ?? 0
  const inPipeline = data?.activeApplications ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        title="Active Jobs"
        value={activeJobs}
        icon={<Briefcase className="h-5 w-5 text-violet-600" />}
        iconBg="bg-violet-50"
        trend={
          activeJobs > 0
            ? { label: `${activeJobs} currently open`, positive: true }
            : { label: 'No open positions', positive: false }
        }
        loading={isLoading}
      />
      <StatCard
        title="Candidates in Pipeline"
        value={inPipeline}
        icon={<Users className="h-5 w-5 text-blue-600" />}
        iconBg="bg-blue-50"
        trend={
          topStage
            ? { label: `Most in ${topStage.stageName}`, positive: true }
            : undefined
        }
        loading={isLoading}
      />
      <StatCard
        title="Interviewed"
        value={interviewedCount}
        icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
        iconBg="bg-emerald-50"
        trend={
          interviewedCount > 0
            ? { label: `${interviewedCount} candidates`, positive: true }
            : { label: 'None yet', positive: false }
        }
        loading={isLoading}
      />
    </div>
  )
}

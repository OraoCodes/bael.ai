'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats } from '@/lib/queries/metrics'

const STATUS_COLORS: Record<string, string> = {
  applied: '#3B82F6',
  screening: '#6366F1',
  interview: '#8B5CF6',
  offer: '#F59E0B',
  hired: '#22C55E',
  rejected: '#EF4444',
}

function getStatusColor(stageName: string): string {
  const key = stageName.toLowerCase().replace(/\s+/g, '_')
  return STATUS_COLORS[key] || '#6B7280'
}

export function RecruitmentStatusCard() {
  const { data, isLoading } = useDashboardStats()
  const stages = data?.appsByStage ?? []
  const total = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recruitment Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {stages.filter(s => s.count > 0).map((stage) => (
              <div key={stage.stageId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">{stage.stageName}</span>
                  <span className="text-xs text-muted-foreground">{stage.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: total > 0 ? `${(stage.count / total) * 100}%` : '0%',
                      backgroundColor: stage.stageColor || getStatusColor(stage.stageName),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

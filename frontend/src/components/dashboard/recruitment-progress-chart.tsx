'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles } from 'lucide-react'
import { useDashboardStats } from '@/lib/queries/metrics'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const BAR_COLORS = ['#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5', '#4338CA']

export function RecruitmentProgressChart() {
  const { data, isLoading } = useDashboardStats()
  const stages = data?.appsByStage ?? []

  const chartData = stages.map((s) => ({
    name: s.stageName,
    count: s.count,
  }))

  const total = stages.reduce((sum, s) => sum + s.count, 0)
  const shortlistedStage = stages.find((s) =>
    s.stageName.toLowerCase().includes('shortlist') ||
    s.stageName.toLowerCase().includes('screen')
  )
  const shortlistedCount = shortlistedStage?.count ?? 0
  const conversionRate = total > 0 ? Math.round((shortlistedCount / total) * 100) : 0
  const dropOffRate = 100 - conversionRate

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recruitment Progress</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Applications funnel by stage</p>
          </div>
          <button className="inline-flex items-center gap-2.5 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[13.5px] font-semibold tracking-[-0.01em] px-5 py-2 transition-colors duration-150 shadow-[0_2px_10px_rgba(37,99,235,0.35)]">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            Analyse drop-offs
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No pipeline data yet.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Micro-copy summary */}
            <div className="mt-3 flex items-center gap-4 rounded-xl bg-muted/50 px-4 py-2.5">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Shortlisted</p>
                <p className="text-sm font-bold text-foreground">{shortlistedCount}</p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p className="text-sm font-bold text-emerald-600">{conversionRate}%</p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="text-sm font-bold text-red-500">{dropOffRate}%</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

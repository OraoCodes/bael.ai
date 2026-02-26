'use client'

import { Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'

interface Interview {
  id: string
  title: string
  time: string
  candidate: string
}

// Placeholder data — will be replaced when interviews feature is implemented
const PLACEHOLDER_INTERVIEWS: Interview[] = [
  { id: '1', title: 'Meet with John Miller', time: '10:00 AM', candidate: 'John Miller' },
  { id: '2', title: 'Meet with John Miller', time: '11:30 AM', candidate: 'John Miller' },
  { id: '3', title: 'Meet with John Miller', time: '2:00 PM', candidate: 'John Miller' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function UpcomingInterviewsCard() {
  // TODO: Replace with useUpcomingInterviews() when interviews table is added
  const interviews = PLACEHOLDER_INTERVIEWS

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Interviews
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <EmptyState description="No upcoming interviews" />
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div key={interview.id} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{interview.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {interview.time}
                  </div>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                  {getInitials(interview.candidate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

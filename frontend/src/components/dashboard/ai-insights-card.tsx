'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AIInsightsCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">AI Insight</p>
            <p className="text-xs text-muted-foreground">
              I want to know what caused the drop-off from shortlisted to interviews.
            </p>
            <Button size="sm" variant="default" className="h-7 text-xs">
              Analyze now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

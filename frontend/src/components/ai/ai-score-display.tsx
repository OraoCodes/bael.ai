'use client'

import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { AiMatchScore } from '@/lib/types/database'
import { formatDate } from '@/lib/utils/format'

interface AiScoreDisplayProps {
  score: AiMatchScore
}

export function AiScoreDisplay({ score }: AiScoreDisplayProps) {
  const pct = Math.round(score.score * 100)
  const colorClass =
    pct >= 70
      ? 'bg-green-100 text-green-700'
      : pct >= 40
        ? 'bg-orange-100 text-orange-700'
        : 'bg-red-100 text-red-700'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer',
            colorClass
          )}
        >
          <Bot className="h-3 w-3" />
          {pct}%
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">AI Match Score</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              colorClass
            )}
          >
            {pct}%
          </span>
        </div>
        <p className="text-[13px] text-foreground mb-2">{score.reasoning}</p>
        <p className="text-[11px] text-muted-foreground">Scored {formatDate(score.computed_at)}</p>
      </PopoverContent>
    </Popover>
  )
}

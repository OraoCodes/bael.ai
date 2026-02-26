'use client'

import { Inbox, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

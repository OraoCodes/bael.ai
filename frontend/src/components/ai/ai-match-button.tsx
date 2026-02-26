'use client'

import { Bot } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAiMatch } from '@/lib/queries/applications'
import { useWorkspace } from '@/components/providers/workspace-provider'

interface AiMatchButtonProps {
  jobId: string
}

export function AiMatchButton({ jobId }: AiMatchButtonProps) {
  const { role } = useWorkspace()
  const aiMatch = useAiMatch()

  const isDisabled = role === 'viewer'

  const handleClick = async () => {
    try {
      const scores = await aiMatch.mutateAsync(jobId)
      toast.success(`Scored ${scores.length} candidate${scores.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error((err as Error).message || 'AI matching failed')
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled || aiMatch.isPending}
    >
      {aiMatch.isPending ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
      ) : (
        <Bot className="mr-2 h-4 w-4" />
      )}
      Run AI Match
    </Button>
  )
}

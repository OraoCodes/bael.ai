'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { CandidateApplicationWithDetails } from '@/lib/types/database'

interface RejectionModalProps {
  open: boolean
  application: CandidateApplicationWithDetails | null
  onConfirm: (reason: string, sendEmail: boolean) => void
  onCancel: () => void
}

export function RejectionModal({ open, application, onConfirm, onCancel }: RejectionModalProps) {
  const aiReason = application?.ai_match_score?.reasoning ?? null
  const candidateName = application
    ? `${application.candidates.first_name} ${application.candidates.last_name}`.trim()
    : ''

  const [mode, setMode] = useState<'ai' | 'custom'>(aiReason ? 'ai' : 'custom')
  const [customReason, setCustomReason] = useState('')
  const [sending, setSending] = useState(false)

  // Reset state each time a new application is shown
  useEffect(() => {
    if (open) {
      setMode(aiReason ? 'ai' : 'custom')
      setCustomReason('')
      setSending(false)
    }
  }, [open, aiReason])

  const activeReason = mode === 'ai' ? (aiReason ?? '') : customReason

  const handleConfirm = (sendEmail: boolean) => {
    setSending(true)
    onConfirm(activeReason, sendEmail)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject {candidateName || 'candidate'}?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Optionally provide a reason. It will be saved on the application and included in the rejection email.
          </p>

          {/* Mode toggle — only show if AI reason is available */}
          {aiReason && (
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                  mode === 'ai'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI suggestion
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`flex-1 py-2 transition-colors ${
                  mode === 'custom'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Write my own
              </button>
            </div>
          )}

          {/* Reason text area */}
          {mode === 'ai' && aiReason ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm text-foreground leading-relaxed">
              {aiReason}
            </div>
          ) : (
            <Textarea
              placeholder="e.g. After careful review, we found a candidate whose experience more closely matches the role requirements."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} disabled={sending} className="sm:mr-auto">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleConfirm(false)}
            disabled={sending}
          >
            Move without email
          </Button>
          <Button
            onClick={() => handleConfirm(true)}
            disabled={sending}
          >
            {sending ? 'Sending…' : 'Reject & send email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

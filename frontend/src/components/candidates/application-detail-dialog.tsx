'use client'

import { useState } from 'react'
import { FileText, ExternalLink, Link2, MessageSquare, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useApplicationAnswers } from '@/lib/queries/applications'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'

interface ApplicationDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  jobTitle: string
  appliedAt: string
  stageName: string | null
  stageColor: string | null
  metadata: Record<string, unknown>
  candidateResumeUrl: string | null
}

export function ApplicationDetailDialog({
  open,
  onOpenChange,
  applicationId,
  jobTitle,
  appliedAt,
  stageName,
  stageColor,
  metadata,
  candidateResumeUrl,
}: ApplicationDetailDialogProps) {
  const { data: answers, isLoading } = useApplicationAnswers(open ? applicationId : null)

  const coverLetter = metadata?.cover_letter as string | undefined
  const source = metadata?.source as string | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{jobTitle}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              Applied {formatDate(appliedAt)}
            </span>
            {stageName && (
              <Badge variant="outline" style={{ borderColor: stageColor ?? undefined, color: stageColor ?? undefined }}>
                {stageName}
              </Badge>
            )}
            {source && (
              <Badge variant="secondary" className="text-xs">
                {source === 'job_board' ? 'Job Board' : source}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Resume */}
          {candidateResumeUrl && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Resume
              </h4>
              <a
                href={candidateResumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                View resume
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Cover Letter */}
          {coverLetter && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Cover Letter
              </h4>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {coverLetter}
                </p>
              </div>
            </div>
          )}

          {/* Custom Answers */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : answers && answers.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Application Responses
              </h4>
              <div className="space-y-3">
                {answers.map((answer) => (
                  <div key={answer.id} className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {answer.field_label}
                    </p>
                    {answer.field_type === 'file' && answer.value ? (
                      <FileAnswerLink storagePath={answer.value} />
                    ) : answer.field_type === 'url' && answer.value ? (
                      <a
                        href={answer.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all inline-flex items-center gap-1"
                      >
                        {answer.value}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : answer.field_type === 'multiselect' && answer.value ? (
                      <div className="flex flex-wrap gap-1.5">
                        {answer.value.split('||').filter(Boolean).map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                        ))}
                      </div>
                    ) : answer.field_type === 'boolean' ? (
                      <p className="text-sm text-foreground">
                        {answer.value === 'true' ? 'Yes' : answer.value === 'false' ? 'No' : (answer.value || '—')}
                      </p>
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {answer.value || '—'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Empty state */}
          {!isLoading && !coverLetter && !candidateResumeUrl && (!answers || answers.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No additional application details available.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FileAnswerLink({ storagePath }: { storagePath: string }) {
  const [loading, setLoading] = useState(false)
  const fileName = storagePath.split('/').pop() || 'attachment'

  const handleDownload = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(storagePath, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (e) {
      console.error('Failed to get download URL:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5 shrink-0" />
      {loading ? 'Loading…' : fileName}
    </button>
  )
}

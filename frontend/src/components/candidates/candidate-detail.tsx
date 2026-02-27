'use client'

import { useState } from 'react'
import { Mail, Phone, Linkedin, FileText, Download, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { Candidate, CandidateAiProfile as AiProfileType } from '@/lib/types/database'
import { formatDate } from '@/lib/utils/format'

interface CandidateDetailProps {
  candidate: Candidate
}

function ResumeDownloadButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(path, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch {
      console.error('Failed to generate download URL')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Download className="h-4 w-4 text-muted-foreground" />
      )}
      Download Resume
    </button>
  )
}

export function CandidateDetail({ candidate }: CandidateDetailProps) {
  const aiProfile = candidate.ai_profile as AiProfileType | null

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">
          {candidate.first_name} {candidate.last_name}
        </h2>

        <div className="flex flex-col gap-2 mb-4">
          {candidate.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${candidate.email}`} className="text-primary hover:underline">
                {candidate.email}
              </a>
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.linkedin_url && (
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                LinkedIn Profile
              </a>
            </div>
          )}
          {candidate.resume_path ? (
            <ResumeDownloadButton path={candidate.resume_path} />
          ) : candidate.resume_url ? (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <a
                href={candidate.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Resume
              </a>
            </div>
          ) : null}
        </div>

        <Separator className="my-4" />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Source</dt>
          <dd>{candidate.source || '-'}</dd>

          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDate(candidate.created_at)}</dd>

          {aiProfile?.total_years_experience !== null && aiProfile?.total_years_experience !== undefined && (
            <>
              <dt className="text-muted-foreground">Experience</dt>
              <dd>{aiProfile.total_years_experience} years</dd>
            </>
          )}

          {aiProfile?.location && (
            <>
              <dt className="text-muted-foreground">Location</dt>
              <dd>{aiProfile.location}</dd>
            </>
          )}

          <dt className="text-muted-foreground">Tags</dt>
          <dd>
            {candidate.tags?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {candidate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              '-'
            )}
          </dd>
        </dl>

        {candidate.notes && (
          <>
            <Separator className="my-4" />
            <h3 className="text-base font-semibold mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground">{candidate.notes}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

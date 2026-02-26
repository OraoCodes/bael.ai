'use client'

import { Mail, Phone, Linkedin, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Candidate } from '@/lib/types/database'
import { formatDate } from '@/lib/utils/format'

interface CandidateDetailProps {
  candidate: Candidate
}

export function CandidateDetail({ candidate }: CandidateDetailProps) {
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
          {candidate.resume_url && (
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
          )}
        </div>

        <Separator className="my-4" />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Source</dt>
          <dd>{candidate.source || '-'}</dd>

          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDate(candidate.created_at)}</dd>

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

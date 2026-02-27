'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Sparkles, Briefcase, MapPin } from 'lucide-react'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { CandidateSearchResult } from '@/lib/queries/candidates'

interface SearchResultCardProps {
  result: CandidateSearchResult
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { workspace } = useWorkspace()
  const base = `/w/${workspace.slug}`
  const profile = result.ai_profile
  const score = Math.round(result.relevance_score * 100)

  const scoreColor =
    score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
    : score >= 60 ? 'bg-blue-50 text-blue-700 border-blue-200/60'
    : 'bg-amber-50 text-amber-700 border-amber-200/60'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <Link
              href={`${base}/candidates/${result.candidate_id}`}
              className="text-[14px] font-semibold text-foreground hover:text-blue-600 transition-colors truncate"
            >
              {result.first_name} {result.last_name}
            </Link>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums ${scoreColor}`}>
              {score}%
            </span>
          </div>
          {result.email && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{result.email}</p>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-zinc-400 tabular-nums">
          #{result.rank}
        </span>
      </div>

      {profile && (
        <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
          {profile.total_years_experience !== null && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {profile.total_years_experience} yrs
            </span>
          )}
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </span>
          )}
          {(profile.experience?.[0]?.title || profile.job_titles?.[0]) && (
            <span>{profile.experience?.[0]?.title ?? profile.job_titles?.[0]}</span>
          )}
        </div>
      )}

      {profile && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.skills.slice(0, 8).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] font-medium text-zinc-600"
            >
              {skill}
            </span>
          ))}
          {profile.skills.length > 8 && (
            <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-[10.5px] text-zinc-400">
              +{profile.skills.length - 8}
            </span>
          )}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11.5px] text-blue-600 font-medium hover:text-blue-700 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          {expanded ? 'Hide' : 'Why this match?'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {expanded && (
          <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed rounded-lg bg-blue-50/50 px-3 py-2">
            {result.explanation}
          </p>
        )}
      </div>
    </div>
  )
}

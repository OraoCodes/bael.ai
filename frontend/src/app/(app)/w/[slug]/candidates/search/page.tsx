'use client'

import { useState } from 'react'
import { Sparkles, Search, Loader2, ArrowLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { SearchResultCard } from '@/components/candidates/search-result-card'
import { useSearchCandidates, type CandidateSearchResponse } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import Link from 'next/link'

export default function CandidateSearchPage() {
  const { workspace } = useWorkspace()
  const base = `/w/${workspace.slug}`
  const searchMutation = useSearchCandidates()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CandidateSearchResponse | null>(null)

  const handleSearch = async () => {
    if (!query.trim() || searchMutation.isPending) return
    try {
      const data = await searchMutation.mutateAsync(query.trim())
      setResults(data)
    } catch {
      toast.error('Search failed — please try again.')
    }
  }

  const interp = results?.query_interpretation

  return (
    <>
      <PageHeader
        title="AI Candidate Search"
        breadcrumbs={[
          { label: 'Candidates', href: `${base}/candidates` },
          { label: 'AI Search' },
        ]}
        extra={
          <Link href={`${base}/candidates`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to list
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        {/* Search bar */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <p className="text-[13px] font-semibold text-foreground">
              Describe the candidate you&apos;re looking for
            </p>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSearch()
              }
            }}
            rows={3}
            placeholder='e.g. "Senior backend developers with distributed systems experience who worked at Google or similar companies"'
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/40 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">
              Press Enter to search · Shift+Enter for new line
            </p>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!query.trim() || searchMutation.isPending}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[13px] font-semibold transition-colors shadow-[0_2px_10px_rgba(59,130,246,0.3)] disabled:opacity-40 disabled:pointer-events-none"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Query interpretation banner */}
        {interp && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 space-y-2">
            <p className="text-[11.5px] text-zinc-500">
              <span className="font-medium text-zinc-600">AI interpretation:</span>{' '}
              {interp.explanation}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {interp.hard_filters.min_years_experience != null && (
                <span className="inline-flex items-center rounded-full bg-white border border-zinc-200 px-2 py-0.5 text-[10.5px] font-medium text-zinc-600">
                  {String(interp.hard_filters.min_years_experience)}+ years
                </span>
              )}
              {Array.isArray(interp.hard_filters.required_skills) && (interp.hard_filters.required_skills as string[]).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10.5px] font-medium text-blue-600"
                >
                  {s}
                </span>
              ))}
              {Array.isArray(interp.hard_filters.required_companies) && (interp.hard_filters.required_companies as string[]).map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-full bg-purple-50 border border-purple-100 px-2 py-0.5 text-[10.5px] font-medium text-purple-600"
                >
                  {c}
                </span>
              ))}
              {typeof interp.hard_filters.location === 'string' && interp.hard_filters.location && (
                <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10.5px] font-medium text-amber-600">
                  {interp.hard_filters.location}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {results && results.results.length === 0 && (
          <EmptyState description="No matching candidates found. Try broadening your search." />
        )}

        {results && results.results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-zinc-500">
                <span className="font-medium text-zinc-700">{results.results.length}</span> candidates found
                {results.total_candidates_searched > 0 && (
                  <span> from {results.total_candidates_searched} searched</span>
                )}
              </p>
            </div>
            {results.results.map((result) => (
              <SearchResultCard key={result.candidate_id} result={result} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

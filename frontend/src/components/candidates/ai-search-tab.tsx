'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Search, Loader2, Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { SearchResultCard } from '@/components/candidates/search-result-card'
import { useSearchCandidates, type CandidateSearchResponse } from '@/lib/queries/candidates'

/* ── localStorage helpers ── */

const RECENT_SEARCHES_KEY = 'bael_ai_recent_searches'

interface RecentSearch {
  query: string
  resultCount: number
  timestamp: number
}

function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string, resultCount: number) {
  const searches = getRecentSearches().filter((s) => s.query !== query)
  searches.unshift({ query, resultCount, timestamp: Date.now() })
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(searches.slice(0, 5))
  )
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY)
}

/* ── Suggestion chips ── */

const SUGGESTIONS = [
  { text: 'Senior React developers with TypeScript experience', color: 'border-blue-200 bg-blue-50/70 text-blue-700 hover:border-blue-300 hover:bg-blue-100' },
  { text: 'Backend engineers with distributed systems background', color: 'border-violet-200 bg-violet-50/70 text-violet-700 hover:border-violet-300 hover:bg-violet-100' },
  { text: 'Product designers with fintech experience', color: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100' },
  { text: 'ML engineers proficient in Python and PyTorch', color: 'border-amber-200 bg-amber-50/70 text-amber-700 hover:border-amber-300 hover:bg-amber-100' },
]

/* ── Component ── */

export function AiSearchTab() {
  const searchMutation = useSearchCandidates()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CandidateSearchResponse | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  const runSearch = useCallback(
    async (text: string) => {
      if (!text.trim() || searchMutation.isPending) return
      try {
        const data = await searchMutation.mutateAsync(text.trim())
        setResults(data)
        saveRecentSearch(text.trim(), data.results.length)
        setRecentSearches(getRecentSearches())
      } catch {
        toast.error('Search failed — please try again.')
      }
    },
    [searchMutation]
  )

  const handleSearch = () => runSearch(query)

  const handleChipClick = (text: string) => {
    setQuery(text)
    runSearch(text)
  }

  const handleClearRecent = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const interp = results?.query_interpretation

  return (
    <div className="py-4">
      {/* Hero + search (centered) */}
      <div className="mx-auto max-w-2xl">
        {!results && (
          <div className="flex flex-col items-center pt-8 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-200/50">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Find your ideal candidate
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe who you&apos;re looking for using natural language
            </p>
          </div>
        )}

        {/* Prompt input */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-md shadow-zinc-100/80">
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
            className="w-full rounded-t-xl border-0 bg-transparent px-4 py-3.5 text-sm placeholder:text-zinc-400 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5">
            <p className="text-[11px] text-zinc-400">
              Press Enter to search · Shift+Enter for new line
            </p>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!query.trim() || searchMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(99,102,241,0.35)] transition-all hover:from-blue-600 hover:to-violet-600 active:from-blue-700 active:to-violet-700 disabled:pointer-events-none disabled:opacity-40"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
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

        {/* Suggestion chips */}
        {!results && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">
              Try searching for
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => handleChipClick(s.text)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${s.color}`}
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent searches */}
        {!results && recentSearches.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Recent searches
              </div>
              <button
                type="button"
                onClick={handleClearRecent}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s) => (
                <button
                  key={s.timestamp}
                  type="button"
                  onClick={() => handleChipClick(s.query)}
                  className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-[12px] text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
                >
                  <Search className="h-3 w-3 text-indigo-400" />
                  <span className="max-w-[200px] truncate">{s.query}</span>
                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-500">
                    {s.resultCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results area (full width) */}
      {results && (
        <div className="mx-auto mt-6 max-w-3xl space-y-4">
          {/* Clear / new search */}
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-zinc-500">
              <span className="font-medium text-zinc-700">
                {results.results.length}
              </span>{' '}
              candidates found
              {results.total_candidates_searched > 0 && (
                <span> from {results.total_candidates_searched} searched</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setResults(null)
                setQuery('')
              }}
              className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear results
            </button>
          </div>

          {/* Query interpretation */}
          {interp && (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 space-y-2">
              <p className="text-[11.5px] text-zinc-500">
                <span className="font-medium text-zinc-600">
                  AI interpretation:
                </span>{' '}
                {interp.explanation}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {interp.hard_filters.min_years_experience != null && (
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-zinc-600">
                    {String(interp.hard_filters.min_years_experience)}+ years
                  </span>
                )}
                {Array.isArray(interp.hard_filters.required_skills) &&
                  (interp.hard_filters.required_skills as string[]).map(
                    (s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-blue-600"
                      >
                        {s}
                      </span>
                    )
                  )}
                {Array.isArray(interp.hard_filters.required_companies) &&
                  (interp.hard_filters.required_companies as string[]).map(
                    (c) => (
                      <span
                        key={c}
                        className="inline-flex items-center rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10.5px] font-medium text-purple-600"
                      >
                        {c}
                      </span>
                    )
                  )}
                {typeof interp.hard_filters.location === 'string' &&
                  interp.hard_filters.location && (
                    <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-600">
                      {interp.hard_filters.location}
                    </span>
                  )}
              </div>
            </div>
          )}

          {/* Result cards */}
          {results.results.length === 0 && (
            <EmptyState description="No matching candidates found. Try broadening your search." />
          )}
          {results.results.map((result) => (
            <SearchResultCard key={result.candidate_id} result={result} />
          ))}
        </div>
      )}
    </div>
  )
}

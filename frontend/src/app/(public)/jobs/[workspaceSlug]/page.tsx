import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchWorkspaceBySlug, fetchPublicJobs } from '@/lib/queries/public-jobs'
import { JobBoardHeader } from '@/components/public/job-board-header'
import { JobCard } from '@/components/public/job-card'

interface Props {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ department?: string; location?: string; type?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceSlug } = await params
  const data = await fetchWorkspaceBySlug(workspaceSlug)
  if (!data) return { title: 'Job Board' }

  const title = data.boardConfig.careers_page_title || `${data.workspace.name} — Careers`
  const description =
    data.boardConfig.careers_page_description ||
    `View open positions at ${data.workspace.name}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

export default async function JobBoardPage({ params, searchParams }: Props) {
  const { workspaceSlug } = await params
  const filters = await searchParams
  const data = await fetchWorkspaceBySlug(workspaceSlug)
  if (!data) notFound()

  const { workspace, boardConfig } = data
  let jobs = await fetchPublicJobs(workspaceSlug)

  // Client-side-like filtering on server
  if (filters.department) {
    jobs = jobs.filter((j) => j.department === filters.department)
  }
  if (filters.location) {
    jobs = jobs.filter((j) =>
      j.location?.toLowerCase().includes(filters.location!.toLowerCase())
    )
  }
  if (filters.type) {
    jobs = jobs.filter((j) => j.employment_type === filters.type)
  }

  // Group by department
  const grouped = new Map<string, typeof jobs>()
  for (const job of jobs) {
    const dept = job.department || 'General'
    if (!grouped.has(dept)) grouped.set(dept, [])
    grouped.get(dept)!.push(job)
  }

  // Unique departments and employment types for filters
  const allJobs = await fetchPublicJobs(workspaceSlug)
  const departments = [...new Set(allJobs.map((j) => j.department).filter(Boolean))] as string[]
  const employmentTypes = [...new Set(allJobs.map((j) => j.employment_type).filter(Boolean))] as string[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <JobBoardHeader
        workspace={workspace}
        title={boardConfig.careers_page_title}
        description={boardConfig.careers_page_description}
        jobCount={jobs.length}
      />

      {/* Filters */}
      {(departments.length > 0 || employmentTypes.length > 0) && (
        <div className="mt-8 flex flex-wrap gap-2">
          <FilterLink
            href={`/jobs/${workspaceSlug}`}
            active={!filters.department && !filters.type}
            label="All"
          />
          {departments.map((dept) => (
            <FilterLink
              key={dept}
              href={`/jobs/${workspaceSlug}?department=${encodeURIComponent(dept)}`}
              active={filters.department === dept}
              label={dept}
            />
          ))}
        </div>
      )}

      {/* Job listings */}
      <div className="mt-8 space-y-8">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center">
            <p className="text-sm text-zinc-500">No open positions at the moment.</p>
            <p className="mt-1 text-xs text-zinc-400">Check back later for new opportunities.</p>
          </div>
        ) : (
          [...grouped.entries()].map(([dept, deptJobs]) => (
            <div key={dept}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {dept}
              </h2>
              <div className="space-y-2">
                {deptJobs.map((job) => (
                  <JobCard key={job.id} job={job} workspaceSlug={workspaceSlug} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-16 border-t border-zinc-200 pt-6 text-center">
        <p className="text-xs text-zinc-400">
          Powered by{' '}
          <span className="font-medium text-zinc-500">bael.ai</span>
        </p>
      </div>
    </div>
  )
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-zinc-900 text-white'
          : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
      }`}
    >
      {label}
    </a>
  )
}

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, MapPin, Briefcase, Clock, Building2, DollarSign } from 'lucide-react'
import { fetchPublicJob } from '@/lib/queries/public-jobs'
import { ApplicationForm } from '@/components/public/application-form'
import { formatSalary } from '@/lib/utils/format'

interface Props {
  params: Promise<{ workspaceSlug: string; jobSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceSlug, jobSlug } = await params
  const data = await fetchPublicJob(workspaceSlug, jobSlug)
  if (!data) return { title: 'Job Not Found' }

  const { job, workspace } = data
  const title = `${job.title} at ${workspace.name}`
  const metaParts = [
    job.location,
    job.employment_type?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  ].filter(Boolean)
  const description = job.description
    ? job.description.replace(/\n/g, ' ').slice(0, 160)
    : `Apply for ${job.title} at ${workspace.name}${metaParts.length ? ` — ${metaParts.join(' · ')}` : ''}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: workspace.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function JobDetailPage({ params }: Props) {
  const { workspaceSlug, jobSlug } = await params
  const data = await fetchPublicJob(workspaceSlug, jobSlug)
  if (!data) notFound()

  const { job, workspace } = data

  const details = [
    job.location && { icon: MapPin, label: job.location },
    job.employment_type && {
      icon: Clock,
      label: job.employment_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    },
    job.workplace_type && {
      icon: Building2,
      label: job.workplace_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    },
    job.department && { icon: Briefcase, label: job.department },
    (job.salary_min || job.salary_max) && {
      icon: DollarSign,
      label: formatSalary(job.salary_min, job.salary_max, job.salary_currency),
    },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string }[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-12 sm:px-6 lg:px-8 overflow-x-hidden">
      {/* Back link */}
      <a
        href={`/jobs/${workspaceSlug}`}
        className="mb-6 sm:mb-8 inline-flex items-center gap-1.5 text-xs sm:text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        All positions at {workspace.name}
      </a>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start gap-3 sm:gap-4">
          {workspace.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={workspace.name}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover ring-1 ring-zinc-200 shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-zinc-900 text-white text-xs sm:text-sm font-bold shrink-0">
              {workspace.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-zinc-500">{workspace.name}</p>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight leading-tight">{job.title}</h1>
          </div>
        </div>

        {/* Meta pills */}
        {details.length > 0 && (
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
            {details.map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-gradient-to-b from-white to-zinc-50/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200/80"
              >
                <d.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-400" />
                {d.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Job description */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 md:p-8">
        {job.description ? (
          <div className="prose prose-sm prose-zinc max-w-none text-[13px] sm:text-sm leading-relaxed">
            {job.description.split('\n').map((line, i) => {
              const trimmed = line.trim()
              if (!trimmed) return <br key={i} />
              if (/^[A-Z].*:$/.test(trimmed)) {
                return <p key={i} className="font-semibold text-zinc-900 mt-4 sm:mt-5 mb-1 text-sm sm:text-base">{trimmed}</p>
              }
              if (/^[-•]\s/.test(trimmed)) {
                return <p key={i} className="ml-3 sm:ml-4 before:content-['•'] before:mr-2 before:text-zinc-400">{trimmed.replace(/^[-•]\s*/, '')}</p>
              }
              return <p key={i} className="mb-1">{line}</p>
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No description provided.</p>
        )}

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="mt-5 sm:mt-6 border-t border-zinc-100 pt-5 sm:pt-6">
            <h3 className="mb-2.5 sm:mb-3 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Skills</h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Application form */}
      <div id="apply" className="mt-8 sm:mt-10">
        <h2 className="mb-4 sm:mb-6 text-base sm:text-lg font-semibold text-zinc-900">Apply for this position</h2>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 md:p-8 min-w-0 overflow-hidden">
          <ApplicationForm
            jobId={job.id}
            jobTitle={job.title}
            workspaceName={workspace.name}
            workspaceSlug={workspaceSlug}
            applicationForm={job.application_form}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 sm:mt-16 border-t border-zinc-200 pt-6 text-center">
        <p className="text-xs text-zinc-400">
          Powered by{' '}
          <a href="https://bael.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-500 hover:text-zinc-700 underline">bael.ai</a>
        </p>
      </div>
    </div>
  )
}

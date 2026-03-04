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
  const description = job.description
    ? job.description.replace(/\n/g, ' ').slice(0, 160)
    : `Apply for ${job.title} at ${workspace.name}`

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
      card: 'summary',
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
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <a
        href={`/jobs/${workspaceSlug}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All open positions at {workspace.name}
      </a>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4">
          {workspace.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={workspace.name}
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-zinc-200"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white text-sm font-bold">
              {workspace.name[0]}
            </div>
          )}
          <div>
            <p className="text-sm text-zinc-500">{workspace.name}</p>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{job.title}</h1>
          </div>
        </div>

        {/* Meta pills */}
        {details.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {details.map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200"
              >
                <d.icon className="h-3.5 w-3.5 text-zinc-400" />
                {d.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Job description */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
        {job.description ? (
          <div className="prose prose-sm prose-zinc max-w-none whitespace-pre-wrap">
            {job.description}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No description provided.</p>
        )}

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Application form */}
      <div id="apply" className="mt-10">
        <h2 className="mb-6 text-lg font-semibold text-zinc-900">Apply for this position</h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
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
      <div className="mt-16 border-t border-zinc-200 pt-6 text-center">
        <p className="text-xs text-zinc-400">
          Powered by{' '}
          <span className="font-medium text-zinc-500">bael.ai</span>
        </p>
      </div>
    </div>
  )
}

import { MapPin, Clock, Building2 } from 'lucide-react'
import type { PublicJob } from '@/lib/queries/public-jobs'

interface JobCardProps {
  job: PublicJob
  workspaceSlug: string
}

export function JobCard({ job, workspaceSlug }: JobCardProps) {
  const meta = [
    job.location && { icon: MapPin, text: job.location },
    job.employment_type && {
      icon: Clock,
      text: job.employment_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    },
    job.workplace_type && {
      icon: Building2,
      text: job.workplace_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; text: string }[]

  return (
    <a
      href={`/jobs/${workspaceSlug}/${job.slug}`}
      className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-all hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
          {job.title}
        </h3>
        {meta.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {meta.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs text-zinc-500"
              >
                <m.icon className="h-3 w-3 text-zinc-400" />
                {m.text}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="ml-4 shrink-0 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
        View &rarr;
      </span>
    </a>
  )
}

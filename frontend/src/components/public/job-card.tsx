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
      className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 sm:px-5 sm:py-4 transition-all hover:border-zinc-300 hover:shadow-sm active:bg-zinc-50"
    >
      <div className="min-w-0">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors leading-snug">
          {job.title}
        </h3>
        {meta.length > 0 && (
          <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
            {meta.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500"
              >
                <m.icon className="h-3 w-3 text-zinc-400" />
                {m.text}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="ml-3 sm:ml-4 shrink-0 text-xs font-medium text-blue-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        &rarr;
      </span>
    </a>
  )
}

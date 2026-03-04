import type { PublicWorkspace } from '@/lib/queries/public-jobs'

interface JobBoardHeaderProps {
  workspace: PublicWorkspace
  title: string | null
  description: string | null
  jobCount: number
}

export function JobBoardHeader({ workspace, title, description, jobCount }: JobBoardHeaderProps) {
  return (
    <div className="text-center">
      {workspace.logo_url ? (
        <img
          src={workspace.logo_url}
          alt={workspace.name}
          className="mx-auto h-14 w-14 rounded-xl object-cover ring-1 ring-zinc-200"
        />
      ) : (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-900 text-white text-lg font-bold">
          {workspace.name[0]}
        </div>
      )}
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
        {title || `Join ${workspace.name}`}
      </h1>
      {description && (
        <p className="mt-2 text-sm text-zinc-500 max-w-lg mx-auto">{description}</p>
      )}
      <p className="mt-3 text-xs text-zinc-400">
        {jobCount} open position{jobCount !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

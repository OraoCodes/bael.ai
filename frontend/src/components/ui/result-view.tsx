import { FileSearch, ShieldOff, XCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultViewProps {
  status: '404' | '403' | 'error' | 'success'
  title: string
  subTitle?: string
  extra?: React.ReactNode
  className?: string
}

const icons = {
  '404': FileSearch,
  '403': ShieldOff,
  error: XCircle,
  success: CheckCircle2,
}

const iconColors = {
  '404': 'text-muted-foreground',
  '403': 'text-muted-foreground',
  error: 'text-destructive',
  success: 'text-green-600',
}

export function ResultView({ status, title, subTitle, extra, className }: ResultViewProps) {
  const Icon = icons[status]
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      <Icon className={cn('h-16 w-16', iconColors[status])} />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subTitle && <p className="text-sm text-muted-foreground">{subTitle}</p>}
      </div>
      {extra && <div className="flex gap-2">{extra}</div>}
    </div>
  )
}

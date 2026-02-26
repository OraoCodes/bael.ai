import { cn } from '@/lib/utils'

interface TimelineItem {
  key: string | number
  dot?: React.ReactNode
  color?: string
  children: React.ReactNode
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('relative', className)}>
      {items.map((item, index) => (
        <li key={item.key} className="flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center">
            {item.dot ? (
              item.dot
            ) : (
              <span
                className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color ?? 'oklch(0.5117 0.2333 264.05)' }}
              />
            )}
            {index < items.length - 1 && (
              <div className="mt-1 w-px flex-1 bg-border" />
            )}
          </div>
          <div className="pb-1 text-sm leading-6">{item.children}</div>
        </li>
      ))}
    </ol>
  )
}

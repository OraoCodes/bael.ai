'use client'

import { PenLine, Sparkles, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CreationMode = 'manual' | 'ai' | 'upload'

const MODES = [
  {
    key: 'manual' as const,
    icon: PenLine,
    label: 'Write it manually',
    description: 'Fill in the job details step by step at your own pace.',
    available: true,
  },
  {
    key: 'ai' as const,
    icon: Sparkles,
    label: 'AI-Assisted',
    description: 'Describe the role or person and let AI draft the full posting.',
    available: true,
  },
  {
    key: 'upload' as const,
    icon: Upload,
    label: 'Upload a job description',
    description: "Upload a PDF and AI will extract the title, skills, and details.",
    available: true,
  },
]

interface Props {
  value: CreationMode
  onChange: (mode: CreationMode) => void
}

export function CreationModeSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      {MODES.map((mode) => {
        const Icon = mode.icon
        const isSelected = value === mode.key
        const isDisabled = !mode.available

        return (
          <button
            key={mode.key}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(mode.key)}
            className={cn(
              'relative flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-150 w-full',
              isSelected
                ? 'border-blue-500 bg-blue-50/60 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]'
                : 'border-border/60 bg-background hover:border-blue-200 hover:bg-blue-50/20',
              isDisabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {/* Radio indicator */}
            <span className="shrink-0">
              <span
                className={cn(
                  'flex h-4.5 w-4.5 items-center justify-center rounded-full border-[1.5px] transition-all duration-150',
                  isSelected
                    ? 'border-blue-500'
                    : 'border-muted-foreground/30'
                )}
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                )}
              </span>
            </span>

            {/* Icon */}
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
                isSelected
                  ? 'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]'
                  : 'bg-muted/70 text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>

            {/* Text */}
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className={cn(
                  'text-[13px] font-semibold tracking-[-0.01em] transition-colors',
                  isSelected ? 'text-blue-700' : 'text-foreground'
                )}>
                  {mode.label}
                </span>
                {isDisabled && (
                  <span className="rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/60">
                    Soon
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-muted-foreground/70 leading-relaxed">
                {mode.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

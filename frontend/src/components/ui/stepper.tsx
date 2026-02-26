import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StepperProps {
  steps: string[]
  current: number
  onStepClick?: (index: number) => void
  completedSteps?: Set<number>
  disabledSteps?: Set<number>
}

export function Stepper({ steps, current, onStepClick, completedSteps, disabledSteps }: StepperProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const isCompleted = completedSteps?.has(index) ?? index < current
        const isActive = index === current
        const isDisabled = disabledSteps?.has(index) ?? false
        const isClickable = onStepClick && !isDisabled

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-200',
                  (isCompleted || isActive) && 'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]',
                  !isCompleted && !isActive && 'border border-zinc-200 bg-white text-zinc-400',
                  isClickable && !isDisabled && 'cursor-pointer hover:opacity-85',
                  !isClickable && 'cursor-default'
                )}
              >
                {isCompleted && !isActive ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </button>
              <span
                className={cn(
                  'text-[11px] font-medium tracking-wide',
                  isActive ? 'text-blue-600' : 'text-zinc-400'
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mx-2 mb-5 transition-colors duration-300',
                  index < current ? 'bg-blue-300' : 'bg-zinc-100'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

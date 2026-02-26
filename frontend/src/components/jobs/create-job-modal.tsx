'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CreationModeSelector, type CreationMode } from '@/components/jobs/creation-mode-selector'
import { JobCreationWizard } from '@/components/jobs/job-creation-wizard'
import { useWorkspace } from '@/components/providers/workspace-provider'

type Screen = 'select' | 'form'

export function CreateJobModal() {
  const [open, setOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('select')
  const [selectedMode, setSelectedMode] = useState<CreationMode>('manual')
  const router = useRouter()
  const { workspace } = useWorkspace()

  const handleOpen = () => {
    setScreen('select')
    setSelectedMode('manual')
    setOpen(true)
  }

  const handleContinue = () => {
    setScreen('form')
  }

  const handleSuccess = (jobId: string) => {
    setOpen(false)
    router.push(`/w/${workspace.slug}/jobs/${jobId}`)
  }

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Create new job
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[460px] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col border-border/50"
          style={{ maxHeight: '90vh' }}
        >
          {/* Two screens side by side — slide left to reveal screen 2 */}
          <div className="flex-1 overflow-hidden min-h-0">
            <div
              className="flex h-full transition-transform duration-300 ease-in-out"
              style={{
                width: '200%',
                transform: screen === 'select' ? 'translateX(0)' : 'translateX(-50%)',
              }}
            >

              {/* ── Screen 1: Mode selection ── */}
              <div className="w-1/2 flex flex-col">
                {/* Header */}
                <div className="px-7 pt-7 pb-1">
                  <DialogTitle className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                    Create a job posting
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-muted-foreground/70 mt-1 leading-snug">
                    Choose how you&apos;d like to get started.
                  </DialogDescription>
                </div>

                {/* Radio cards */}
                <div className="flex-1 px-7 pt-5 pb-2">
                  <CreationModeSelector
                    value={selectedMode}
                    onChange={setSelectedMode}
                  />
                </div>

                {/* Action */}
                <div className="px-7 pb-7 pt-4">
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full h-11 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[13.5px] font-semibold tracking-[-0.01em] transition-colors duration-150 shadow-[0_2px_12px_rgba(59,130,246,0.4)]"
                  >
                    Continue
                  </button>
                </div>
              </div>

              {/* ── Screen 2: Wizard form ── */}
              <div className="w-1/2 flex flex-col overflow-hidden min-h-0">
                {/* Header */}
                <div className="px-7 pt-7 pb-4 border-b border-border/40 shrink-0">
                  <DialogTitle className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                    Post a Job
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-muted-foreground/70 mt-1 leading-snug">
                    Fill in the details. Save as draft or publish immediately.
                  </DialogDescription>
                </div>

                {/* Scrollable wizard body */}
                <div className="flex-1 overflow-y-auto min-h-0 px-7 py-5">
                  {screen === 'form' && (
                    <JobCreationWizard
                      inModal
                      initialMode={selectedMode}
                      onSuccess={handleSuccess}
                    />
                  )}
                </div>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

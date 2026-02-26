'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Stepper } from '@/components/ui/stepper'
import { CreationModeSelector, type CreationMode } from '@/components/jobs/creation-mode-selector'
import { WizardStepBasics } from '@/components/jobs/wizard-step-basics'
import { WizardStepDetails } from '@/components/jobs/wizard-step-details'
import { WizardStepFinalize } from '@/components/jobs/wizard-step-finalize'
import { AiGeneratePanel } from '@/components/jobs/ai-generate-panel'
import { PdfUploadPanel } from '@/components/jobs/pdf-upload-panel'
import { useCreateJob, type AiGeneratedJob } from '@/lib/queries/jobs'
import { useWorkspace } from '@/components/providers/workspace-provider'
import {
  jobWizardSchema,
  WIZARD_DEFAULTS,
  STEP_1_FIELDS,
  type JobWizardValues,
} from '@/lib/schemas/job-wizard'
import type { Job } from '@/lib/types/database'

const STEPS = ['Basics', 'Details', 'Finalize']

interface JobCreationWizardProps {
  /** When true, strips Card wrappers and mode selector (modal handles those) */
  inModal?: boolean
  /** Pre-selected creation mode, passed from the modal's mode-selection screen */
  initialMode?: CreationMode
  /** Called with the new job id on success (modal closes + navigates) */
  onSuccess?: (jobId: string) => void
}

export function JobCreationWizard({
  inModal = false,
  initialMode = 'manual',
  onSuccess,
}: JobCreationWizardProps) {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const createMutation = useCreateJob()
  const base = `/w/${workspace.slug}`

  // Page mode has its own mode selector; modal mode uses the initialMode passed in
  const [mode, setMode] = useState<CreationMode>(initialMode)
  const [currentStep, setCurrentStep] = useState(0)
  const [step1Valid, setStep1Valid] = useState(false)
  const [aiPrefilled, setAiPrefilled] = useState(false)

  const form = useForm<JobWizardValues>({
    resolver: zodResolver(jobWizardSchema),
    defaultValues: WIZARD_DEFAULTS,
  })

  const disabledSteps = useMemo(() => {
    const set = new Set<number>()
    if (!step1Valid) { set.add(1); set.add(2) }
    return set
  }, [step1Valid])

  const completedSteps = useMemo(() => {
    const set = new Set<number>()
    if (step1Valid) set.add(0)
    return set
  }, [step1Valid])

  const validateStep1 = async (): Promise<boolean> => {
    const valid = await form.trigger(STEP_1_FIELDS)
    setStep1Valid(valid)
    return valid
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      const valid = await validateStep1()
      if (!valid) return
    }
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const handleStepClick = async (index: number) => {
    if (index === 0) { setCurrentStep(0); return }
    if (!step1Valid) {
      const valid = await validateStep1()
      if (!valid) return
    }
    setCurrentStep(index)
  }

  const handleAiGenerated = (values: AiGeneratedJob) => {
    form.reset({
      ...WIZARD_DEFAULTS,
      title: values.title ?? '',
      description: values.description ?? '',
      department: values.department ?? undefined,
      employment_type: (values.employment_type as JobWizardValues['employment_type']) ?? undefined,
      seniority_level: (values.seniority_level as JobWizardValues['seniority_level']) ?? undefined,
      workplace_type: (values.workplace_type as JobWizardValues['workplace_type']) ?? undefined,
      job_function: (values.job_function as JobWizardValues['job_function']) ?? undefined,
      skills: values.skills ?? [],
    })
    setAiPrefilled(true)
    setStep1Valid(true)
  }

  const normalizeSkills = (skills: string[]): string[] =>
    [...new Set(skills.map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 10)

  const submitJob = async (status: 'draft' | 'open') => {
    const valid = await form.trigger()
    if (!valid) { toast.error('Please fill in all required fields'); return }

    const values = form.getValues()
    const jobData: Partial<Job> = {
      title: values.title,
      description: values.description || '',
      department: values.department || undefined,
      location: values.location || undefined,
      employment_type: values.employment_type || undefined,
      seniority_level: values.seniority_level || undefined,
      workplace_type: values.workplace_type || undefined,
      job_function: values.job_function || undefined,
      skills: normalizeSkills(values.skills ?? []),
      salary_min: values.salary_min ? Number(values.salary_min) : undefined,
      salary_max: values.salary_max ? Number(values.salary_max) : undefined,
      salary_currency: values.salary_currency || 'USD',
      expires_at: values.expires_at || undefined,
      assigned_to: values.assigned_to || undefined,
      source_type: mode === 'manual' ? 'manual' : 'assisted',
      status,
    }

    try {
      const job = await createMutation.mutateAsync(jobData)
      toast.success(status === 'open' ? 'Job published' : 'Job saved as draft')
      if (onSuccess) {
        onSuccess(job.id)
      } else {
        router.push(`${base}/jobs/${job.id}`)
      }
    } catch {
      toast.error('Failed to create job')
    }
  }

  const aiBannerText = mode === 'upload'
    ? 'Extracted from PDF — please review before publishing'
    : 'Suggested by AI — please review before publishing'

  const aiBanner = aiPrefilled ? (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/60 bg-blue-50 px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <p className="text-[12px] text-blue-700 font-medium">{aiBannerText}</p>
      </div>
      <button
        type="button"
        onClick={() => setAiPrefilled(false)}
        className="text-blue-400 hover:text-blue-600 transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null

  const stepperForm = (
    <div className="space-y-5">
      <Stepper
        steps={STEPS}
        current={currentStep}
        onStepClick={handleStepClick}
        completedSteps={completedSteps}
        disabledSteps={disabledSteps}
      />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className={inModal ? 'w-full' : 'max-w-2xl'}>
          {currentStep === 0 && <WizardStepBasics form={form} />}
          {currentStep === 1 && <WizardStepDetails form={form} />}
          {currentStep === 2 && (
            <WizardStepFinalize
              form={form}
              onSaveDraft={() => submitJob('draft')}
              onPublish={() => submitJob('open')}
              loading={createMutation.isPending}
            />
          )}

          {currentStep < 2 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 h-9 px-5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[13px] font-semibold tracking-[-0.01em] transition-colors shadow-[0_2px_10px_rgba(59,130,246,0.35)]"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </form>
      </Form>
    </div>
  )

  // Modal mode: bare panel only (mode was already chosen on screen 1)
  if (inModal) {
    if (mode === 'ai' && !aiPrefilled) {
      return <AiGeneratePanel onGenerated={handleAiGenerated} />
    }
    if (mode === 'upload' && !aiPrefilled) {
      return <PdfUploadPanel onExtracted={handleAiGenerated} />
    }
    return (
      <div className="space-y-4">
        {aiBanner}
        {stepperForm}
      </div>
    )
  }

  // Page mode: mode selector + stepper, wrapped in a card
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              How would you like to create this job?
            </p>
            <CreationModeSelector value={mode} onChange={(m) => { setMode(m); setAiPrefilled(false) }} />
          </div>
          <div className="border-t" />
          {mode === 'ai' && !aiPrefilled ? (
            <AiGeneratePanel onGenerated={handleAiGenerated} />
          ) : mode === 'upload' && !aiPrefilled ? (
            <PdfUploadPanel onExtracted={handleAiGenerated} />
          ) : (
            <div className="space-y-4">
              {aiBanner}
              {stepperForm}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

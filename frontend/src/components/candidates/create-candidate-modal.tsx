'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ResumeUploadPanel } from '@/components/candidates/resume-upload-panel'
import { CandidateForm, type CandidateFormValues } from '@/components/candidates/candidate-form'
import { useCreateCandidate, useUpdateCandidate, useUploadResume, useEmbedCandidate, type AiParsedResume } from '@/lib/queries/candidates'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { Candidate, CandidateAiProfile } from '@/lib/types/database'

export function CreateCandidateModal() {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const createMutation = useCreateCandidate()
  const updateMutation = useUpdateCandidate()
  const uploadResume = useUploadResume()
  const embedCandidate = useEmbedCandidate()
  const base = `/w/${workspace.slug}`

  const [open, setOpen] = useState(false)

  // AI extraction state
  const [aiPrefilled, setAiPrefilled] = useState(false)
  const [aiData, setAiData] = useState<AiParsedResume | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [aiInitialValues, setAiInitialValues] = useState<Partial<Candidate> | undefined>(undefined)

  const handleOpen = () => {
    setAiPrefilled(false)
    setAiData(null)
    setResumeFile(null)
    setAiInitialValues(undefined)
    setOpen(true)
  }

  const handleAiExtracted = (result: AiParsedResume, file: File) => {
    setAiData(result)
    setResumeFile(file)
    setAiInitialValues({
      first_name: result.first_name,
      last_name: result.last_name,
      email: result.email,
      phone: result.phone,
      linkedin_url: result.linkedin_url,
      tags: result.skills,
      notes: '',
    })
    setAiPrefilled(true)
  }

  const handleSubmit = async (values: CandidateFormValues) => {
    try {
      const aiProfile: CandidateAiProfile | undefined = aiData ? {
        skills: aiData.skills,
        experience: aiData.experience,
        education: aiData.education,
        certifications: aiData.certifications,
        total_years_experience: aiData.total_years_experience,
        languages: aiData.languages,
        location: aiData.location,
      } : undefined

      const candidate = await createMutation.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone || null,
        linkedin_url: values.linkedin_url || null,
        source: values.source || null,
        notes: values.notes || '',
        tags: values.tags || [],
        ...(aiData ? {
          resume_text: aiData.resume_text,
          ai_summary: aiData.summary,
        } : {}),
        ...(aiProfile ? {
          ai_profile: aiProfile as unknown as Record<string, unknown>,
        } : {}),
      } as Partial<Candidate>)

      // Upload resume file to storage if we have one
      if (resumeFile && candidate.id) {
        try {
          const path = await uploadResume.mutateAsync({
            candidateId: candidate.id,
            file: resumeFile,
          })
          await updateMutation.mutateAsync({
            id: candidate.id,
            resume_path: path,
          } as Partial<Candidate> & { id: string })
        } catch {
          console.error('Resume upload failed, candidate was still created')
        }
      }

      // Generate embedding in background if we have an AI summary
      if (aiData?.summary && candidate.id) {
        embedCandidate.mutateAsync(candidate.id).catch(console.error)
      }

      toast.success('Candidate created')
      setOpen(false)
      router.push(`${base}/candidates/${candidate.id}`)
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr?.code === '23505') {
        toast.error('A candidate with this email already exists in your workspace')
      } else {
        toast.error('Failed to create candidate')
      }
    }
  }

  const isSubmitting = createMutation.isPending || uploadResume.isPending

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Add Candidate
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[640px] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col border-border/50"
          style={{ maxHeight: '90vh' }}
        >
          <div className="flex flex-col overflow-hidden min-h-0" style={{ maxHeight: '90vh' }}>
            <div className="px-7 pt-7 pb-4 border-b border-border/40 shrink-0">
              <DialogTitle className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                {aiPrefilled ? 'Candidate details' : 'Add a candidate'}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground/70 mt-1 leading-snug">
                {aiPrefilled
                  ? 'Review the extracted information before saving.'
                  : 'Upload a PDF resume and AI will extract the candidate details.'}
              </DialogDescription>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-7 py-5">
              {!aiPrefilled ? (
                <ResumeUploadPanel onExtracted={handleAiExtracted} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/60 bg-blue-50 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <p className="text-[12px] text-blue-700 font-medium">
                        Extracted from resume — please review
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAiPrefilled(false)
                        setAiData(null)
                        setResumeFile(null)
                        setAiInitialValues(undefined)
                      }}
                      className="text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <CandidateForm
                    initialValues={aiInitialValues}
                    aiData={aiData}
                    onSubmit={handleSubmit}
                    loading={isSubmitting}
                    submitLabel="Create Candidate"
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Candidate } from '@/lib/types/database'
import type { AiParsedResume } from '@/lib/queries/candidates'
import { CANDIDATE_SOURCES } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'

/* ── Shared style tokens (matching job wizard) ── */
const inputCls = 'h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] shadow-none placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'
const inputSmCls = 'h-8 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] shadow-none placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'
const inputLineCls = 'h-8 rounded-none border-0 border-b border-zinc-200 bg-transparent px-1 text-[13px] shadow-none placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-0 transition-colors'
const triggerCls = 'w-full h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] shadow-none data-[placeholder]:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15'
const contentCls = 'rounded-xl border-zinc-200/80 shadow-xl'
const itemCls = 'rounded-lg text-[13px] cursor-pointer'
const labelCls = 'text-xs font-medium text-zinc-500'
const textareaCls = 'rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] shadow-none placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'

const experienceSchema = z.object({
  title: z.string().min(1, 'Required'),
  company: z.string().min(1, 'Required'),
  location: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
})

const educationSchema = z.object({
  degree: z.string().min(1, 'Required'),
  field: z.string().nullable().optional(),
  institution: z.string().min(1, 'Required'),
  year: z.number().nullable().optional(),
})

const certificationSchema = z.object({
  name: z.string().min(1, 'Required'),
  issuer: z.string().nullable().optional(),
})

const schema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  experience: z.array(experienceSchema).optional(),
  education: z.array(educationSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
})

export type CandidateFormValues = z.infer<typeof schema>

interface CandidateFormProps {
  initialValues?: Partial<Candidate>
  aiData?: AiParsedResume | null
  onSubmit: (values: CandidateFormValues) => void
  loading?: boolean
  submitLabel?: string
}

const STEPS = [
  { key: 'personal', label: 'Personal' },
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
] as const

type StepKey = (typeof STEPS)[number]['key']

/* ── Skill Tag Input ── */
function SkillTagInput({
  value = [],
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const VISIBLE_COUNT = 6

  const addTag = () => {
    const tag = input.trim().toLowerCase()
    if (tag && !value.includes(tag) && value.length < 30) {
      onChange([...value, tag])
      setInput('')
    }
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const visibleTags = expanded ? value : value.slice(0, VISIBLE_COUNT)
  const hiddenCount = value.length - VISIBLE_COUNT

  return (
    <div className="space-y-3">
      <Input
        className={inputCls}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag()
          }
        }}
        placeholder="Type a skill and press Enter"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[12px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200/60"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-400 hover:text-blue-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {expanded ? (
                <>Show less <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>+{hiddenCount} more <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Step Indicator ── */
function StepIndicator({ steps, current }: { steps: typeof STEPS; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {steps.map((step, idx) => {
        const isComplete = idx < current
        const isCurrent = idx === current
        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-1.5 flex-1">
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors',
                  isComplete
                    ? 'bg-blue-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isComplete ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                'h-px flex-1 min-w-3',
                isComplete ? 'bg-blue-400' : 'bg-border'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function CandidateForm({
  initialValues,
  aiData,
  onSubmit,
  loading,
  submitLabel = 'Save',
}: CandidateFormProps) {
  const [step, setStep] = useState(0)
  const [expExpanded, setExpExpanded] = useState(false)
  const [eduExpanded, setEduExpanded] = useState(false)
  const EXP_VISIBLE = 3
  const EDU_VISIBLE = 2

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: initialValues?.first_name ?? '',
      last_name: initialValues?.last_name ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      linkedin_url: initialValues?.linkedin_url ?? '',
      source: initialValues?.source ?? '',
      notes: initialValues?.notes ?? '',
      tags: initialValues?.tags ?? [],
      experience: aiData?.experience ?? [],
      education: aiData?.education ?? [],
      certifications: aiData?.certifications ?? [],
    },
  })

  const {
    fields: expFields,
    append: appendExp,
    remove: removeExp,
  } = useFieldArray({ control: form.control, name: 'experience' })

  const {
    fields: eduFields,
    append: appendEdu,
    remove: removeEdu,
  } = useFieldArray({ control: form.control, name: 'education' })

  const {
    fields: certFields,
    append: appendCert,
    remove: removeCert,
  } = useFieldArray({ control: form.control, name: 'certifications' })

  const canGoNext = async () => {
    if (step === 0) {
      return await form.trigger(['first_name', 'last_name'])
    }
    return true
  }

  const handleNext = async () => {
    if (await canGoNext()) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 0))

  const isLastStep = step === STEPS.length - 1

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col"
      >
        <StepIndicator steps={STEPS} current={step} />

        {/* ── Step 1: Personal Info ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>First Name</FormLabel>
                    <FormControl>
                      <Input className={inputCls} placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Last Name</FormLabel>
                    <FormControl>
                      <Input className={inputCls} placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Email</FormLabel>
                    <FormControl>
                      <Input className={inputCls} type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Phone</FormLabel>
                    <FormControl>
                      <Input className={inputCls} placeholder="+1 555 0123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="linkedin_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>LinkedIn</FormLabel>
                  <FormControl>
                    <Input className={inputCls} placeholder="linkedin.com/in/johndoe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={triggerCls}>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={contentCls}>
                      {CANDIDATE_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className={itemCls}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ── Step 2: Skills ── */}
        {step === 1 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>Skills & Tags</FormLabel>
                  <FormControl>
                    <SkillTagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      className={textareaCls}
                      rows={3}
                      placeholder="Additional notes about this candidate..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ── Step 3: Experience ── */}
        {step === 2 && (() => {
          const visibleExp = expExpanded ? expFields : expFields.slice(0, EXP_VISIBLE)
          const hiddenExpCount = expFields.length - EXP_VISIBLE
          return (
            <div className="space-y-2.5">
              {visibleExp.map((field, idx) => (
                <div key={field.id} className="group relative rounded-xl bg-zinc-50/50 px-3.5 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`experience.${idx}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Job title" className={inputSmCls} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`experience.${idx}.company`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Company" className={inputSmCls} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExp(idx)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name={`experience.${idx}.location`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Location" className={inputLineCls} {...field} value={field.value ?? ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`experience.${idx}.start_date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Start" className={inputLineCls} {...field} value={field.value ?? ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`experience.${idx}.end_date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="End / Present" className={inputLineCls} {...field} value={field.value ?? ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              {hiddenExpCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpExpanded(!expExpanded)}
                  className="w-full flex items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-medium text-zinc-500 hover:text-blue-600 hover:bg-zinc-50 transition-colors"
                >
                  {expExpanded ? (
                    <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                  ) : (
                    <>+{hiddenExpCount} more experience{hiddenExpCount > 1 ? 's' : ''} <ChevronDown className="h-3.5 w-3.5" /></>
                  )}
                </button>
              )}
              {expFields.length === 0 && (
                <div className="text-center py-6 text-[13px] text-zinc-400">
                  No experience entries yet
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  appendExp({ title: '', company: '', location: null, start_date: null, end_date: null })
                  setExpExpanded(true)
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-200 py-2.5 text-[12px] font-medium text-zinc-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add experience
              </button>
            </div>
          )
        })()}

        {/* ── Step 4: Education & Certifications ── */}
        {step === 3 && (() => {
          const visibleEdu = eduExpanded ? eduFields : eduFields.slice(0, EDU_VISIBLE)
          const hiddenEduCount = eduFields.length - EDU_VISIBLE
          return (
            <div className="space-y-5">
              {/* Education */}
              <div className="space-y-2.5">
                <span className={labelCls}>Education</span>
                {visibleEdu.map((field, idx) => (
                  <div key={field.id} className="group relative rounded-xl bg-zinc-50/50 px-3.5 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`education.${idx}.degree`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Degree" className={inputSmCls} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`education.${idx}.institution`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Institution" className={inputSmCls} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEdu(idx)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`education.${idx}.field`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Field of study" className={inputLineCls} {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`education.${idx}.year`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Year"
                                className={inputLineCls}
                                type="number"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                {hiddenEduCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setEduExpanded(!eduExpanded)}
                    className="w-full flex items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-medium text-zinc-500 hover:text-blue-600 hover:bg-zinc-50 transition-colors"
                  >
                    {eduExpanded ? (
                      <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                    ) : (
                      <>+{hiddenEduCount} more <ChevronDown className="h-3.5 w-3.5" /></>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    appendEdu({ degree: '', field: null, institution: '', year: null })
                    setEduExpanded(true)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-200 py-2.5 text-[12px] font-medium text-zinc-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add education
                </button>
              </div>

              {/* Certifications */}
              <div className="space-y-2.5">
                <span className={labelCls}>Certifications</span>
                {certFields.map((field, idx) => (
                  <div key={field.id} className="group flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`certifications.${idx}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Certification" className={inputSmCls} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`certifications.${idx}.issuer`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Issuer" className={inputSmCls} {...field} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCert(idx)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendCert({ name: '', issuer: null })}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-200 py-2.5 text-[12px] font-medium text-zinc-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add certification
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className={cn(
              'inline-flex items-center gap-1 text-[13px] font-medium transition-colors',
              step === 0
                ? 'text-muted-foreground/30 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {isLastStep ? (
            <Button type="submit" disabled={loading}>
              {loading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              )}
              {submitLabel}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

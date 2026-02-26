import { z } from 'zod'

export const jobWizardSchema = z.object({
  // Step 1: Basics
  title: z.string().min(1, 'Job title is required'),
  workplace_type: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  seniority_level: z.string().optional(),

  // Step 2: Details
  department: z.string().optional(),
  job_function: z.string().optional(),
  description: z.string().optional(),
  skills: z.array(z.string()).max(10, 'Maximum 10 skills').default([]),

  // Step 3: Finalize
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  salary_currency: z.string().default('USD'),
  expires_at: z.string().optional(),
  assigned_to: z.string().optional(),
})

export type JobWizardValues = z.input<typeof jobWizardSchema>

// Per-step field names for validation gating
export const STEP_1_FIELDS: (keyof JobWizardValues)[] = [
  'title',
  'workplace_type',
  'location',
  'employment_type',
  'seniority_level',
]

export const STEP_2_FIELDS: (keyof JobWizardValues)[] = [
  'department',
  'job_function',
  'description',
  'skills',
]

export const STEP_3_FIELDS: (keyof JobWizardValues)[] = [
  'salary_min',
  'salary_max',
  'salary_currency',
  'expires_at',
  'assigned_to',
]

export const WIZARD_DEFAULTS: JobWizardValues = {
  title: '',
  workplace_type: undefined,
  location: undefined,
  employment_type: undefined,
  seniority_level: undefined,
  department: undefined,
  job_function: undefined,
  description: undefined,
  skills: [],
  salary_min: undefined,
  salary_max: undefined,
  salary_currency: 'USD',
  expires_at: undefined,
  assigned_to: undefined,
}

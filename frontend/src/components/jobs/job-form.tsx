'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SkillTagInput } from '@/components/jobs/skill-tag-input'
import type { Job } from '@/lib/types/database'
import { EMPLOYMENT_TYPES, SENIORITY_LEVELS, WORKPLACE_TYPES, JOB_FUNCTIONS } from '@/lib/utils/constants'
import { useMembers } from '@/lib/queries/team'
import { cn } from '@/lib/utils'

const JOB_STATUSES = [
  { label: 'Draft', value: 'draft' },
  { label: 'Open', value: 'open' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
]

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  seniority_level: z.string().optional(),
  workplace_type: z.string().optional(),
  job_function: z.string().optional(),
  status: z.string().optional(),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  salary_currency: z.string().optional(),
  assigned_to: z.string().optional(),
  skills: z.array(z.string()).max(10).default([]),
  expires_at: z.string().optional(),
})

type FormValues = z.input<typeof schema>

interface JobFormProps {
  initialValues?: Partial<Job>
  onSubmit: (values: Partial<Job>) => void
  loading?: boolean
  submitLabel?: string
}

export function JobForm({
  initialValues,
  onSubmit,
  loading,
  submitLabel = 'Save',
}: JobFormProps) {
  const { data: members } = useMembers()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      department: initialValues?.department ?? '',
      location: initialValues?.location ?? '',
      employment_type: initialValues?.employment_type ?? '',
      seniority_level: initialValues?.seniority_level ?? '',
      workplace_type: initialValues?.workplace_type ?? '',
      job_function: initialValues?.job_function ?? '',
      status: initialValues?.status ?? 'draft',
      salary_min: initialValues?.salary_min != null ? String(initialValues.salary_min) : '',
      salary_max: initialValues?.salary_max != null ? String(initialValues.salary_max) : '',
      salary_currency: initialValues?.salary_currency ?? 'USD',
      assigned_to: initialValues?.assigned_to ?? '',
      skills: initialValues?.skills ?? [],
      expires_at: initialValues?.expires_at ?? '',
    },
  })

  const handleSubmit = (values: FormValues) => {
    const skills = [...new Set(
      (values.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean)
    )].slice(0, 10)

    onSubmit({
      ...values,
      skills,
      salary_min: values.salary_min ? Number(values.salary_min) : undefined,
      salary_max: values.salary_max ? Number(values.salary_max) : undefined,
      assigned_to: values.assigned_to || undefined,
      expires_at: values.expires_at || undefined,
    } as Partial<Job>)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="Senior Software Engineer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder="Job description..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Engineering" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Remote / New York" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="workplace_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workplace Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORKPLACE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="seniority_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seniority Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SENIORITY_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="employment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="job_function"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Function</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select function" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {JOB_FUNCTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? 'draft'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {JOB_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recruiter" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(members || []).map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.users.full_name || m.users.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="salary_min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary Min</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="50000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salary_max"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary Max</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="100000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salary_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? 'USD'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="KES">KES</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Deadline</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(new Date(field.value), 'PPP') : 'No deadline'}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString() ?? '')}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel className="mb-2 block">Skills</FormLabel>
          <Controller
            control={form.control}
            name="skills"
            render={({ field }) => (
              <SkillTagInput value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
          )}
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}

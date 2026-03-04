'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, FileText, X, CheckCircle2, Loader2 } from 'lucide-react'
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
import type { ApplicationFormConfig, ApplicationFormField } from '@/lib/types/database'

const inputCls =
  'h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] shadow-none placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'
const triggerCls =
  'w-full h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] shadow-none data-[placeholder]:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15'
const contentCls = 'rounded-xl border-zinc-200/80 shadow-xl'
const itemCls = 'rounded-lg text-[13px] cursor-pointer'
const labelCls = 'text-xs font-medium text-zinc-500'
const textareaCls =
  'rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] shadow-none placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'

interface ApplicationFormProps {
  jobId: string
  jobTitle: string
  workspaceName: string
  workspaceSlug: string
  applicationForm: ApplicationFormConfig | null
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_FILE_SIZE = 5 * 1024 * 1024

const baseSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  cover_letter: z.string().optional(),
  linkedin_url: z.string().optional(),
  website: z.string().optional(), // honeypot
})

type FormValues = z.infer<typeof baseSchema> & Record<string, string | undefined>

export function ApplicationForm({
  jobId,
  jobTitle,
  workspaceName,
  workspaceSlug,
  applicationForm,
}: ApplicationFormProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const config = applicationForm ?? { fields: [], require_phone: false, require_cover_letter: false, require_resume: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    resolver: zodResolver(baseSchema) as any,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      cover_letter: '',
      linkedin_url: '',
      website: '',
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Please upload a PDF, DOC, or DOCX file')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 5MB')
      return
    }
    setError(null)
    setResumeFile(file)
  }

  const onSubmit = async (values: FormValues) => {
    // Honeypot check
    if (values.website) return

    if (config.require_resume && !resumeFile) {
      setError('Resume is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('job_id', jobId)
      formData.append('first_name', values.first_name)
      formData.append('last_name', values.last_name)
      formData.append('email', values.email)
      if (values.phone) formData.append('phone', values.phone)
      if (values.linkedin_url) formData.append('linkedin_url', values.linkedin_url)
      if (values.cover_letter) formData.append('cover_letter', values.cover_letter)
      if (values.website) formData.append('website', values.website) // honeypot
      if (resumeFile) formData.append('resume', resumeFile)

      // Custom answers
      if (config.fields.length > 0) {
        const answers = config.fields
          .map((field) => ({
            field_key: field.key,
            field_label: field.label,
            field_type: field.type,
            value: values[`custom_${field.key}`] || '',
          }))
          .filter((a) => a.value)

        if (answers.length > 0) {
          formData.append('custom_answers', JSON.stringify(answers))
        }
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-application`,
        { method: 'POST', body: formData }
      )

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || 'Something went wrong')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-4 text-lg font-semibold text-zinc-900">Application submitted!</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Thank you for applying for <span className="font-medium">{jobTitle}</span> at{' '}
          <span className="font-medium">{workspaceName}</span>.
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          We&apos;ll review your application and get back to you.
        </p>
        <a
          href={`/jobs/${workspaceSlug}`}
          className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          &larr; View all positions
        </a>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Honeypot — hidden from humans */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <input {...form.register('website')} tabIndex={-1} autoComplete="off" />
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>First Name *</FormLabel>
                <FormControl>
                  <Input className={inputCls} placeholder="Jane" {...field} />
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
                <FormLabel className={labelCls}>Last Name *</FormLabel>
                <FormControl>
                  <Input className={inputCls} placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Email *</FormLabel>
              <FormControl>
                <Input className={inputCls} type="email" placeholder="jane@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        {(config.require_phone || true) && (
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>
                  Phone {config.require_phone ? '*' : '(optional)'}
                </FormLabel>
                <FormControl>
                  <Input className={inputCls} placeholder="+1 555 0123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* LinkedIn */}
        <FormField
          control={form.control}
          name="linkedin_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>LinkedIn (optional)</FormLabel>
              <FormControl>
                <Input
                  className={inputCls}
                  placeholder="https://linkedin.com/in/janedoe"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Resume upload */}
        <div>
          <label className={`block mb-1.5 ${labelCls}`}>
            Resume {config.require_resume ? '*' : '(optional)'}
          </label>
          {resumeFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 px-4 py-3">
              <FileText className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-700">{resumeFile.name}</p>
                <p className="text-xs text-zinc-400">
                  {(resumeFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResumeFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/30 py-6 text-sm text-zinc-500 hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-600 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload resume (PDF, DOC, DOCX — max 5MB)
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Cover letter */}
        {(config.require_cover_letter || false) && (
          <FormField
            control={form.control}
            name="cover_letter"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>
                  Cover Letter {config.require_cover_letter ? '*' : '(optional)'}
                </FormLabel>
                <FormControl>
                  <Textarea
                    className={textareaCls}
                    rows={4}
                    placeholder="Tell us why you're interested in this role..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Dynamic custom fields */}
        {config.fields.map((field) => (
          <DynamicField key={field.key} field={field} form={form} />
        ))}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button type="submit" className="w-full h-11 rounded-xl" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {resumeFile ? 'Analyzing resume\u2026' : 'Submitting\u2026'}
            </>
          ) : (
            'Submit Application'
          )}
        </Button>
        {submitting && resumeFile && (
          <p className="text-center text-[11px] text-zinc-400">
            Parsing your resume with AI — this takes around 15 seconds.
          </p>
        )}
      </form>
    </Form>
  )
}

function DynamicField({
  field,
  form,
}: {
  field: ApplicationFormField
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
}) {
  const name = `custom_${field.key}`

  if (field.type === 'select' && field.options) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel className={labelCls}>
              {field.label} {field.required ? '*' : '(optional)'}
            </FormLabel>
            <Select onValueChange={formField.onChange} defaultValue={formField.value}>
              <FormControl>
                <SelectTrigger className={triggerCls}>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={contentCls}>
                {field.options!.map((opt) => (
                  <SelectItem key={opt} value={opt} className={itemCls}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel className={labelCls}>
              {field.label} {field.required ? '*' : '(optional)'}
            </FormLabel>
            <FormControl>
              <Textarea className={textareaCls} rows={3} {...formField} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel className={labelCls}>
            {field.label} {field.required ? '*' : '(optional)'}
          </FormLabel>
          <FormControl>
            <Input
              className={inputCls}
              type={field.type === 'url' ? 'url' : 'text'}
              {...formField}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Stepper } from '@/components/ui/stepper'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'

const COMPANY_SIZES = [
  { label: '1-10', value: '1-10' },
  { label: '11-50', value: '11-50' },
  { label: '51-200', value: '51-200' },
  { label: '201-1000', value: '201-1000' },
  { label: '1000+', value: '1000+' },
]

const INDUSTRIES = [
  { label: 'Technology', value: 'technology' },
  { label: 'Finance', value: 'finance' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Retail', value: 'retail' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Consulting', value: 'consulting' },
  { label: 'Other', value: 'other' },
]

const HIRING_VOLUMES = [
  { label: '1-5 per month', value: '1-5' },
  { label: '6-20 per month', value: '6-20' },
  { label: '21-50 per month', value: '21-50' },
  { label: '50+ per month', value: '50+' },
]

const schema = z.object({
  name: z.string().min(1, 'Enter a workspace name'),
  slug: z
    .string()
    .min(1, 'Enter a URL slug')
    .regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, '3-50 chars: lowercase letters, numbers, hyphens'),
  company_size: z.string().optional(),
  industry: z.string().optional(),
  hiring_volume: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function OnboardPage() {
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      company_size: undefined,
      industry: undefined,
      hiring_volume: undefined,
    },
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const values = form.getValues()
      const { data, error } = await supabase.functions.invoke('create-workspace', {
        body: {
          name: values.name,
          slug: values.slug,
          company_size: values.company_size,
          industry: values.industry,
          hiring_volume: values.hiring_volume,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })
      if (error) throw error
      toast.success('Workspace created!')
      router.push(`/w/${data.workspace.slug}`)
    } catch (err) {
      toast.error((err as Error).message || 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  const next = async () => {
    if (current === 0) {
      const valid = await form.trigger(['name', 'slug'])
      if (!valid) return
    }
    setCurrent(current + 1)
  }

  const stepContents = [
    // Step 0: Workspace
    <div key="workspace" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace Name</Label>
        <Input
          id="name"
          placeholder="Acme Corp"
          {...form.register('name', {
            onChange: (e) => {
              form.setValue('slug', slugify(e.target.value))
            },
          })}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>URL Slug</Label>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            bael.ai/w/
          </span>
          <Input className="rounded-l-none" placeholder="acme-corp" {...form.register('slug')} />
        </div>
        {form.formState.errors.slug && (
          <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
        )}
      </div>
    </div>,

    // Step 1: Company
    <div key="company" className="space-y-4">
      <div className="space-y-2">
        <Label>Company Size</Label>
        <Select
          onValueChange={(val) => form.setValue('company_size', val)}
          defaultValue={form.getValues('company_size')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_SIZES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Industry</Label>
        <Select
          onValueChange={(val) => form.setValue('industry', val)}
          defaultValue={form.getValues('industry')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Hiring Volume</Label>
        <Select
          onValueChange={(val) => form.setValue('hiring_volume', val)}
          defaultValue={form.getValues('hiring_volume')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select volume" />
          </SelectTrigger>
          <SelectContent>
            {HIRING_VOLUMES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>,

    // Step 2: Finish
    <div key="finish" className="py-5 text-center">
      <h4 className="text-lg font-semibold">All set!</h4>
      <p className="text-muted-foreground">
        Your workspace will be created with default pipeline stages: Applied, Phone Screen, Interview, Offer, Hired,
        and Rejected.
      </p>
    </div>,
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-6">
      <Card className="w-[560px]">
        <CardContent className="pt-6">
          <h3 className="mb-8 text-center text-xl font-semibold">Create your workspace</h3>
          <Stepper steps={['Workspace', 'Company', 'Finish']} current={current} />
          <div className="mt-8">{stepContents[current]}</div>
          <div className="mt-6 flex justify-between">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
              Back
            </Button>
            {current < stepContents.length - 1 ? (
              <Button onClick={next}>Next</Button>
            ) : (
              <Button disabled={loading} onClick={handleSubmit}>
                {loading ? 'Creating...' : 'Create Workspace'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

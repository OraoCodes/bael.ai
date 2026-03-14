'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Upload, X, Building2, Users, Sparkles, Check, ArrowRight, ArrowLeft, ImagePlus, Briefcase, GraduationCap, HeartPulse, ShoppingBag, Factory, Lightbulb, Landmark, MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

const COMPANY_SIZES = [
  { label: '1-10', value: '1-10', sub: 'Startup' },
  { label: '11-50', value: '11-50', sub: 'Small' },
  { label: '51-200', value: '51-200', sub: 'Medium' },
  { label: '201-1k', value: '201-1000', sub: 'Large' },
  { label: '1000+', value: '1000+', sub: 'Enterprise' },
]

const INDUSTRIES = [
  { label: 'Technology', value: 'technology', icon: Lightbulb },
  { label: 'Finance', value: 'finance', icon: Landmark },
  { label: 'Healthcare', value: 'healthcare', icon: HeartPulse },
  { label: 'Education', value: 'education', icon: GraduationCap },
  { label: 'Retail', value: 'retail', icon: ShoppingBag },
  { label: 'Manufacturing', value: 'manufacturing', icon: Factory },
  { label: 'Consulting', value: 'consulting', icon: Briefcase },
  { label: 'Other', value: 'other', icon: MoreHorizontal },
]

const HIRING_VOLUMES = [
  { label: '1-5', value: '1-5', sub: 'per month' },
  { label: '6-20', value: '6-20', sub: 'per month' },
  { label: '21-50', value: '21-50', sub: 'per month' },
  { label: '50+', value: '50+', sub: 'per month' },
]

const STEPS = [
  { label: 'Workspace', icon: Building2, description: 'Set up your workspace' },
  { label: 'Company', icon: Users, description: 'Tell us about your company' },
  { label: 'Launch', icon: Sparkles, description: 'You\'re all set' },
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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

      // Upload logo if selected
      if (logoFile && data.workspace.id) {
        const ext = logoFile.name.split('.').pop() || 'png'
        const path = `${data.workspace.id}/logo.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('workspace-avatars')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('workspace-avatars')
            .getPublicUrl(path)

          await supabase
            .from('workspaces')
            .update({ logo_url: `${publicUrl}?v=${Date.now()}` })
            .eq('id', data.workspace.id)
        }
      }

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

  const watchName = form.watch('name')

  const inputCls = 'h-11 rounded-xl border-zinc-200 bg-zinc-50/50 text-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400 transition-all'
  const labelCls = 'text-[13px] font-medium text-zinc-700'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-4 sm:p-6">
      {/* Subtle decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[520px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-zinc-900 tracking-tight">bael.ai</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200/60 bg-white/80 backdrop-blur-sm shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Stepper */}
          <div className="border-b border-zinc-100 px-8 pt-8 pb-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isCompleted = index < current
                const isActive = index === current
                const StepIcon = step.icon
                return (
                  <div key={step.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300',
                          isCompleted && 'bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]',
                          isActive && 'bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] ring-4 ring-blue-500/10',
                          !isCompleted && !isActive && 'bg-zinc-100 text-zinc-400'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          'text-[11px] font-semibold tracking-wide uppercase transition-colors',
                          isActive ? 'text-blue-600' : isCompleted ? 'text-zinc-500' : 'text-zinc-400'
                        )}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'h-[2px] flex-1 mx-3 mb-6 rounded-full transition-all duration-500',
                          index < current ? 'bg-blue-400' : 'bg-zinc-100'
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="px-8 py-7">
            {/* Step title — hidden on finish step since it has its own layout */}
            {current < 2 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {current === 0 && 'Set up your workspace'}
                  {current === 1 && 'Tell us about your company'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {current === 0 && 'This is where your team will manage candidates and jobs.'}
                  {current === 1 && 'Help us tailor your experience. All fields are optional.'}
                </p>
              </div>
            )}

            {/* Step 0: Workspace */}
            {current === 0 && (
              <div className="space-y-5">
                {/* Logo upload */}
                <div className="space-y-2">
                  <Label className={labelCls}>Logo</Label>
                  <div
                    className={cn(
                      'relative flex items-center gap-5 rounded-xl border-2 border-dashed p-4 transition-all cursor-pointer',
                      dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <div className="relative h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center overflow-hidden ring-1 ring-zinc-200/50">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlus className="h-6 w-6 text-zinc-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-700">
                        {logoFile ? logoFile.name : 'Drop your logo here or click to upload'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">PNG, JPG or SVG. Max 10MB.</p>
                    </div>
                    {logoFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveLogo() }}
                        className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                  </div>
                </div>

                {/* Workspace name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className={labelCls}>Workspace Name</Label>
                  <Input
                    id="name"
                    placeholder="Acme Corp"
                    className={inputCls}
                    {...form.register('name', {
                      onChange: (e) => {
                        form.setValue('slug', slugify(e.target.value))
                      },
                    })}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                {/* URL slug */}
                <div className="space-y-2">
                  <Label className={labelCls}>URL Slug</Label>
                  <div className="flex rounded-xl overflow-hidden ring-1 ring-zinc-200 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <span className="inline-flex items-center bg-zinc-50 px-3.5 text-sm text-zinc-400 border-r border-zinc-200 select-none">
                      bael.ai/w/
                    </span>
                    <Input
                      className="border-0 rounded-none shadow-none focus-visible:ring-0 h-11 bg-zinc-50/50 text-sm"
                      placeholder="acme-corp"
                      {...form.register('slug')}
                    />
                  </div>
                  {form.formState.errors.slug && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.slug.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Company */}
            {current === 1 && (
              <div className="space-y-7">
                {/* Company Size — horizontal chips */}
                <div className="space-y-3">
                  <Label className={labelCls}>How big is your team?</Label>
                  <div className="flex gap-2">
                    {COMPANY_SIZES.map((item) => {
                      const selected = form.watch('company_size') === item.value
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => form.setValue('company_size', item.value)}
                          className={cn(
                            'flex-1 flex flex-col items-center gap-0.5 rounded-xl py-3 px-2 text-center transition-all duration-200 border',
                            selected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                          )}
                        >
                          <span className={cn(
                            'text-sm font-semibold',
                            selected ? 'text-blue-700' : 'text-zinc-900'
                          )}>
                            {item.label}
                          </span>
                          <span className={cn(
                            'text-[10px]',
                            selected ? 'text-blue-500' : 'text-zinc-400'
                          )}>
                            {item.sub}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Industry — icon grid */}
                <div className="space-y-3">
                  <Label className={labelCls}>What industry are you in?</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {INDUSTRIES.map((item) => {
                      const selected = form.watch('industry') === item.value
                      const Icon = item.icon
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => form.setValue('industry', item.value)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl py-3.5 px-2 transition-all duration-200 border',
                            selected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                          )}
                        >
                          <Icon className={cn(
                            'h-4.5 w-4.5',
                            selected ? 'text-blue-600' : 'text-zinc-400'
                          )} />
                          <span className={cn(
                            'text-[11px] font-medium leading-tight',
                            selected ? 'text-blue-700' : 'text-zinc-600'
                          )}>
                            {item.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Hiring Volume — horizontal chips */}
                <div className="space-y-3">
                  <Label className={labelCls}>How many hires per month?</Label>
                  <div className="flex gap-2">
                    {HIRING_VOLUMES.map((item) => {
                      const selected = form.watch('hiring_volume') === item.value
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => form.setValue('hiring_volume', item.value)}
                          className={cn(
                            'flex-1 flex flex-col items-center gap-0.5 rounded-xl py-3 px-2 text-center transition-all duration-200 border',
                            selected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                          )}
                        >
                          <span className={cn(
                            'text-sm font-semibold',
                            selected ? 'text-blue-700' : 'text-zinc-900'
                          )}>
                            {item.label}
                          </span>
                          <span className={cn(
                            'text-[10px]',
                            selected ? 'text-blue-500' : 'text-zinc-400'
                          )}>
                            {item.sub}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Finish */}
            {current === 2 && (
              <div className="py-6 flex flex-col items-center text-center">
                {/* Celebration icon */}
                <div className="relative mb-5">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(59,130,246,0.3)] overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {(watchName || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 flex items-center justify-center ring-3 ring-white shadow-sm">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-zinc-900">
                  {watchName || 'Your workspace'} is ready
                </h3>
                <p className="mt-2 text-sm text-zinc-500 max-w-[320px] leading-relaxed">
                  Everything is set up and waiting for you. Start posting jobs, adding candidates, and building your dream team.
                </p>

                <div className="mt-5 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="inline-block h-1 w-1 rounded-full bg-zinc-300" />
                  bael.ai/w/{form.watch('slug') || '...'}
                  <span className="inline-block h-1 w-1 rounded-full bg-zinc-300" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-100 px-8 py-5 flex items-center justify-between bg-zinc-50/30">
            <Button
              variant="ghost"
              disabled={current === 0}
              onClick={() => setCurrent(current - 1)}
              className="rounded-xl text-zinc-500 hover:text-zinc-700 h-10 px-4"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            {current < STEPS.length - 1 ? (
              <Button
                onClick={next}
                className="rounded-xl h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.35)] transition-all"
              >
                Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                disabled={loading}
                onClick={handleSubmit}
                className="rounded-xl h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.35)] transition-all"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Workspace
                    <Sparkles className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          You can always update these settings later.
        </p>
      </div>
    </div>
  )
}

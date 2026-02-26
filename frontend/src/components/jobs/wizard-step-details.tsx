'use client'

import { UseFormReturn, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
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
import { JOB_FUNCTIONS } from '@/lib/utils/constants'
import { SkillTagInput } from '@/components/jobs/skill-tag-input'
import type { JobWizardValues } from '@/lib/schemas/job-wizard'

const inputCls = 'h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'
const triggerCls = 'w-full h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] data-[placeholder]:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15'
const contentCls = 'rounded-xl border-zinc-200/80 shadow-xl'
const itemCls = 'rounded-lg text-[13px] cursor-pointer'
const labelCls = 'text-xs font-medium text-zinc-500'

interface Props {
  form: UseFormReturn<JobWizardValues>
}

export function WizardStepDetails({ form }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelCls}>Department</FormLabel>
              <FormControl>
                <Input className={inputCls} placeholder="e.g. Engineering" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="job_function"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelCls}>Job Function</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue placeholder="Select function" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={contentCls}>
                  {JOB_FUNCTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className={itemCls}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="gap-1.5">
            <FormLabel className={labelCls}>Job Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the role, responsibilities, and requirements..."
                className="h-44 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white resize-none overflow-y-auto leading-relaxed transition-colors"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-[11px]" />
          </FormItem>
        )}
      />

      <div className="gap-1.5 flex flex-col">
        <span className="text-xs font-medium text-zinc-500">Skills</span>
        <Controller
          control={form.control}
          name="skills"
          render={({ field }) => (
            <SkillTagInput value={field.value ?? []} onChange={field.onChange} />
          )}
        />
      </div>
    </div>
  )
}

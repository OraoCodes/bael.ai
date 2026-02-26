'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
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
import { EMPLOYMENT_TYPES, SENIORITY_LEVELS, WORKPLACE_TYPES } from '@/lib/utils/constants'
import type { JobWizardValues } from '@/lib/schemas/job-wizard'

const inputCls = 'h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'
const triggerCls = 'w-full h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] data-[placeholder]:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15'
const contentCls = 'rounded-xl border-zinc-200/80 shadow-xl'
const itemCls = 'rounded-lg text-[13px] cursor-pointer'
const labelCls = 'text-xs font-medium text-zinc-500'

interface Props {
  form: UseFormReturn<JobWizardValues>
}

export function WizardStepBasics({ form }: Props) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem className="gap-1.5">
            <FormLabel className={labelCls}>Job Title</FormLabel>
            <FormControl>
              <Input className={inputCls} placeholder="e.g. Senior Software Engineer" {...field} />
            </FormControl>
            <FormMessage className="text-[11px]" />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="workplace_type"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelCls}>Workplace Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={contentCls}>
                  {WORKPLACE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className={itemCls}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelCls}>Location</FormLabel>
              <FormControl>
                <Input className={inputCls} placeholder="e.g. New York, NY" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="employment_type"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelCls}>Employment Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={contentCls}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className={itemCls}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="seniority_level"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className={labelCls}>Seniority Level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={contentCls}>
                  {SENIORITY_LEVELS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className={itemCls}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

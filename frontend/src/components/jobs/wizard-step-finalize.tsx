'use client'

import { UseFormReturn } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMembers } from '@/lib/queries/team'
import { cn } from '@/lib/utils'
import type { JobWizardValues } from '@/lib/schemas/job-wizard'

const inputCls = 'h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15 focus-visible:bg-white transition-colors'
const triggerCls = 'w-full h-10 rounded-xl border-zinc-200 bg-zinc-50/40 text-[13px] data-[placeholder]:text-zinc-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/15'
const contentCls = 'rounded-xl border-zinc-200/80 shadow-xl'
const itemCls = 'rounded-lg text-[13px] cursor-pointer'
const labelCls = 'text-xs font-medium text-zinc-500'

interface Props {
  form: UseFormReturn<JobWizardValues>
  onSaveDraft: () => void
  onPublish: () => void
  loading: boolean
}

export function WizardStepFinalize({ form, onSaveDraft, onPublish, loading }: Props) {
  const { data: members } = useMembers()

  return (
    <div className="space-y-4">
      {/* Salary row */}
      <div>
        <span className="text-xs font-medium text-zinc-500 block mb-1.5">Salary Range</span>
        <div className="grid grid-cols-[1fr_1fr_88px] gap-2">
          <FormField
            control={form.control}
            name="salary_min"
            render={({ field }) => (
              <FormItem className="gap-1">
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Min"
                    className={inputCls}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salary_max"
            render={({ field }) => (
              <FormItem className="gap-1">
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Max"
                    className={inputCls}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salary_currency"
            render={({ field }) => (
              <FormItem className="gap-1">
                <Select onValueChange={field.onChange} value={field.value ?? 'USD'}>
                  <FormControl>
                    <SelectTrigger className={triggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={contentCls}>
                    {['USD', 'EUR', 'GBP', 'KES'].map((c) => (
                      <SelectItem key={c} value={c} className={itemCls}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Deadline */}
      <FormField
        control={form.control}
        name="expires_at"
        render={({ field }) => (
          <FormItem className="gap-1.5">
            <FormLabel className={labelCls}>Application Deadline</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center h-10 rounded-xl border border-zinc-200 bg-zinc-50/40 px-3 text-[13px] text-left transition-colors hover:border-zinc-300',
                      !field.value && 'text-zinc-400'
                    )}
                  >
                    <CalendarIcon className="mr-2.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    {field.value ? format(new Date(field.value), 'PPP') : 'No deadline set'}
                  </button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl border-zinc-200/80 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString())}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            <FormMessage className="text-[11px]" />
          </FormItem>
        )}
      />

      {/* Assigned recruiter */}
      <FormField
        control={form.control}
        name="assigned_to"
        render={({ field }) => (
          <FormItem className="gap-1.5">
            <FormLabel className={labelCls}>Assigned Recruiter</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger className={triggerCls}>
                  <SelectValue placeholder="Select recruiter" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={contentCls}>
                {(members || []).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id} className={itemCls}>
                    {m.users.full_name || m.users.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-[11px]" />
          </FormItem>
        )}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2.5 pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={loading}
          className="flex-1 h-10 rounded-xl border border-zinc-200 bg-white text-[13px] font-medium text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save as Draft
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={loading}
          className="flex-[2] h-10 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[13px] font-semibold tracking-[-0.01em] transition-colors shadow-[0_2px_12px_rgba(59,130,246,0.35)] disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Publish Job
        </button>
      </div>
    </div>
  )
}

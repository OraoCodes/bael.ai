'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApplicationFormConfig, ApplicationFormField } from '@/lib/types/database'

interface ApplicationFormBuilderProps {
  value: ApplicationFormConfig
  onChange: (config: ApplicationFormConfig) => void
}

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Dropdown' },
  { value: 'boolean', label: 'Yes/No' },
] as const

const PRESET_QUESTIONS: ApplicationFormField[] = [
  { key: 'linkedin_url', label: 'LinkedIn Profile URL', type: 'url', required: false },
  { key: 'country', label: 'Country of Residence', type: 'select', required: false, options: ['United States', 'United Kingdom', 'Kenya', 'Germany', 'Canada', 'Australia', 'India', 'Other'] },
  { key: 'salary_expectations', label: 'Salary Expectations', type: 'text', required: false },
  { key: 'work_authorization', label: 'Work Authorization Status', type: 'select', required: true, options: ['Authorized', 'Requires Sponsorship', 'Other'] },
  { key: 'notice_period', label: 'Notice Period', type: 'text', required: false },
  { key: 'motivation', label: 'Why are you interested in this role?', type: 'textarea', required: false },
]

export function ApplicationFormBuilder({ value, onChange }: ApplicationFormBuilderProps) {
  const [expanded, setExpanded] = useState(false)
  const [newFieldType, setNewFieldType] = useState<string>('text')

  const updateField = (index: number, updates: Partial<ApplicationFormField>) => {
    const fields = [...value.fields]
    fields[index] = { ...fields[index], ...updates }
    onChange({ ...value, fields })
  }

  const removeField = (index: number) => {
    onChange({ ...value, fields: value.fields.filter((_, i) => i !== index) })
  }

  const addField = () => {
    const key = `custom_${Date.now()}`
    onChange({
      ...value,
      fields: [
        ...value.fields,
        { key, label: '', type: newFieldType as ApplicationFormField['type'], required: false },
      ],
    })
  }

  const addPreset = (preset: ApplicationFormField) => {
    if (value.fields.some((f) => f.key === preset.key)) return
    onChange({ ...value, fields: [...value.fields, { ...preset }] })
  }

  const updateOptions = (index: number, optionsStr: string) => {
    const options = optionsStr.split(',').map((o) => o.trim()).filter(Boolean)
    updateField(index, { options })
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-semibold text-zinc-700"
        onClick={() => setExpanded(!expanded)}
      >
        Application Form Settings
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="space-y-5 pt-2">
          {/* System field toggles */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Default fields</p>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require phone number</Label>
              <Switch
                checked={value.require_phone}
                onCheckedChange={(v) => onChange({ ...value, require_phone: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require cover letter</Label>
              <Switch
                checked={value.require_cover_letter}
                onCheckedChange={(v) => onChange({ ...value, require_cover_letter: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require resume</Label>
              <Switch
                checked={value.require_resume}
                onCheckedChange={(v) => onChange({ ...value, require_resume: v })}
              />
            </div>
          </div>

          {/* Preset questions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Quick-add questions</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUESTIONS.filter((p) => !value.fields.some((f) => f.key === p.key)).map(
                (preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => addPreset(preset)}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {preset.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Custom fields */}
          {value.fields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Custom questions</p>
              {value.fields.map((field, idx) => (
                <div
                  key={field.key}
                  className="group rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Question label"
                      className="h-8 text-sm flex-1"
                    />
                    <Select
                      value={field.type}
                      onValueChange={(v) =>
                        updateField(idx, { type: v as ApplicationFormField['type'] })
                      }
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-zinc-400">Req</Label>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(v) => updateField(idx, { required: v })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {field.type === 'select' && (
                    <Input
                      value={(field.options || []).join(', ')}
                      onChange={(e) => updateOptions(idx, e.target.value)}
                      placeholder="Options (comma-separated)"
                      className="h-8 text-xs ml-6"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add custom field */}
          <div className="flex items-center gap-2">
            <Select value={newFieldType} onValueChange={setNewFieldType}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Question
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

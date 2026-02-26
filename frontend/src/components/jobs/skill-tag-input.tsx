'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

const MAX_SKILLS = 10

interface SkillTagInputProps {
  value: string[]
  onChange: (skills: string[]) => void
}

function normalize(skill: string): string {
  return skill.trim().toLowerCase()
}

export function SkillTagInput({ value, onChange }: SkillTagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addSkill = (raw: string) => {
    const skill = normalize(raw)
    if (!skill || value.includes(skill) || value.length >= MAX_SKILLS) return
    onChange([...value, skill])
    setInput('')
  }

  const removeSkill = (skill: string) => {
    onChange(value.filter((s) => s !== skill))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeSkill(value[value.length - 1])
    }
  }

  return (
    <div
      className="min-h-10 rounded-xl border border-zinc-200 bg-zinc-50/40 px-3 py-2 flex flex-wrap gap-1.5 cursor-text transition-colors focus-within:border-blue-400 focus-within:ring-[3px] focus-within:ring-blue-500/15 focus-within:bg-white"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[11.5px] font-medium text-blue-700"
        >
          {skill}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeSkill(skill) }}
            className="rounded-full p-0.5 hover:bg-blue-200/60 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {value.length < MAX_SKILLS && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input) addSkill(input) }}
          placeholder={value.length === 0 ? 'Type a skill, press Enter or comma' : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent text-[13px] text-zinc-700 placeholder:text-zinc-400 outline-none"
        />
      )}
      <span className="ml-auto self-end text-[10.5px] text-zinc-400 font-medium tabular-nums">
        {value.length}/{MAX_SKILLS}
      </span>
    </div>
  )
}

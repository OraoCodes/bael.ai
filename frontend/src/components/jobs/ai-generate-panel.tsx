'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useGenerateJob, type AiGeneratedJob } from '@/lib/queries/jobs'

interface AiGeneratePanelProps {
  onGenerated: (values: AiGeneratedJob) => void
}

export function AiGeneratePanel({ onGenerated }: AiGeneratePanelProps) {
  const [prompt, setPrompt] = useState('')
  const generateMutation = useGenerateJob()

  const handleGenerate = async () => {
    if (!prompt.trim() || generateMutation.isPending) return
    try {
      const result = await generateMutation.mutateAsync(prompt.trim())
      onGenerated(result)
    } catch {
      toast.error('Generation failed — please try again or write it manually.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.35)]">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">
            Describe the role
          </p>
          <p className="text-[11.5px] text-zinc-400 leading-snug">
            Tell us about the person or role you&apos;re hiring for — AI handles the rest.
          </p>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={generateMutation.isPending}
        rows={5}
        placeholder={`e.g. "We need a senior backend engineer who can lead our infra team, build scalable APIs in Go and Postgres, and mentor junior devs. Remote-friendly, ideally someone who's worked in a fast-paced startup before."`}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/40 px-3.5 py-3 text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/15 focus:bg-white resize-none leading-relaxed transition-colors disabled:opacity-60"
      />

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-400">
          ⌘ + Enter to generate
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim() || generateMutation.isPending}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[13px] font-semibold tracking-[-0.01em] transition-colors shadow-[0_2px_10px_rgba(59,130,246,0.35)] disabled:opacity-40 disabled:pointer-events-none"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Generate with AI
            </>
          )}
        </button>
      </div>
    </div>
  )
}

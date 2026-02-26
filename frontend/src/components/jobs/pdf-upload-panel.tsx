'use client'

import { useState, useRef, useCallback } from 'react'
import { FileText, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useExtractJobFromPdf, type AiGeneratedJob } from '@/lib/queries/jobs'

const MAX_SIZE_BYTES = 4 * 1024 * 1024 // 4MB

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface PdfUploadPanelProps {
  onExtracted: (values: AiGeneratedJob) => void
}

export function PdfUploadPanel({ onExtracted }: PdfUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const extractMutation = useExtractJobFromPdf()

  const validateAndSetFile = (f: File) => {
    setFileError(null)
    if (f.type !== 'application/pdf') {
      setFileError('Only PDF files are supported.')
      return
    }
    if (f.size > MAX_SIZE_BYTES) {
      setFileError('File must be under 4MB.')
      return
    }
    setFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) validateAndSetFile(selected)
  }

  const handleExtract = async () => {
    if (!file || extractMutation.isPending) return
    try {
      const result = await extractMutation.mutateAsync(file)
      onExtracted(result)
    } catch {
      toast.error('Could not extract details — try a different file or create manually.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.35)]">
          <Upload className="h-3.5 w-3.5 text-white" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">
            Upload a job description
          </p>
          <p className="text-[11.5px] text-zinc-400 leading-snug">
            PDF only · max 4MB — AI will extract all the details.
          </p>
        </div>
      </div>

      {/* Drop zone / file preview */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed cursor-pointer py-10 px-4 transition-colors',
            dragOver
              ? 'border-blue-400 bg-blue-50/60'
              : 'border-zinc-200 bg-zinc-50/40 hover:border-blue-300 hover:bg-blue-50/30',
          ].join(' ')}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
            <FileText className="h-5 w-5 text-zinc-400" />
          </span>
          <div className="text-center">
            <p className="text-[13px] font-medium text-zinc-600">
              Drop your PDF here
            </p>
            <p className="text-[11.5px] text-zinc-400 mt-0.5">
              or{' '}
              <span className="text-blue-500 font-medium">click to browse</span>
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 px-3.5 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50">
            <FileText className="h-4 w-4 text-red-500" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-zinc-700 truncate">{file.name}</p>
            <p className="text-[11px] text-zinc-400">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => { setFile(null); setFileError(null) }}
            className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {fileError && (
        <p className="text-[11.5px] text-red-500">{fileError}</p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleExtract}
          disabled={!file || !!fileError || extractMutation.isPending}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[13px] font-semibold tracking-[-0.01em] transition-colors shadow-[0_2px_10px_rgba(59,130,246,0.35)] disabled:opacity-40 disabled:pointer-events-none"
        >
          {extractMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5" />
              Extract with AI
            </>
          )}
        </button>
      </div>
    </div>
  )
}

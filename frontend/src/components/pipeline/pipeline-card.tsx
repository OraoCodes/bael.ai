'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Bot, Star, CalendarX2, CalendarCheck, MapPin, Phone, Building2, Video } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { CandidateApplicationWithDetails } from '@/lib/types/database'
import { formatFullName, formatDate } from '@/lib/utils/format'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useUpdateApplicationRating, useUpdateInterviewDetails } from '@/lib/queries/applications'
import { CAN_WRITE } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

// ─── Brand Icons ────────────────────────────────────────────────────────────

function GoogleMeetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="12" height="12" rx="2" fill="#00897B" />
      <polygon points="14,9 20,5 20,19 14,15" fill="#00897B" />
      <rect x="5" y="9.5" width="6" height="5" rx="0.5" fill="white" />
    </svg>
  )
}

function ZoomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="4" width="22" height="16" rx="4" fill="#2D8CFF" />
      <rect x="4" y="8" width="9" height="7" rx="1" fill="white" />
      <polygon points="14,10 19,7.5 19,15.5 14,13" fill="white" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path d="M17 14.5c-.3-.15-1.7-.85-2-1-.3-.1-.5-.15-.7.15-.2.3-.75.95-.9 1.15-.2.2-.35.2-.65.05-.3-.15-1.25-.45-2.4-1.45-.9-.8-1.5-1.75-1.65-2.05-.15-.3 0-.45.15-.6.1-.15.3-.35.4-.5.15-.15.2-.3.3-.45.1-.2.05-.35 0-.5-.05-.15-.7-1.65-.95-2.25-.25-.6-.5-.5-.7-.5h-.6c-.2 0-.5.05-.75.35S6 7.55 6 9.05s1.45 3 1.65 3.2c.2.2 2.85 4.35 6.9 6.1 4.05 1.75 4.05 1.15 4.8 1.1.75-.05 2.4-.95 2.75-1.9.35-.95.35-1.75.25-1.9-.1-.2-.3-.3-.6-.45z" fill="white" />
    </svg>
  )
}

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="3" fill="#5059C9" />
      <circle cx="16" cy="8" r="2.5" fill="white" />
      <path d="M13 14c0-1.7 1.3-3 3-3s3 1.3 3 3v2h-6v-2z" fill="white" />
      <circle cx="9" cy="9" r="2.5" fill="white" />
      <path d="M5 15c0-2.2 1.8-4 4-4s4 1.8 4 4v2H5v-2z" fill="white" />
    </svg>
  )
}

export const ONLINE_PLATFORMS = [
  { key: 'google_meet', label: 'Google Meet', icon: GoogleMeetIcon },
  { key: 'zoom', label: 'Zoom', icon: ZoomIcon },
  { key: 'phone_call', label: 'Phone Call', icon: Phone },
  { key: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon },
  { key: 'teams', label: 'Teams', icon: TeamsIcon },
] as const

export function getPlatformConfig(key: string) {
  return ONLINE_PLATFORMS.find((p) => p.key === key)
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface PipelineCardProps {
  application: CandidateApplicationWithDetails
}

function AiScoreBadge({ score, reasoning }: { score: number; reasoning: string }) {
  const pct = Math.round(score * 100)
  const colorClass =
    pct >= 70
      ? 'bg-green-100 text-green-700'
      : pct >= 40
        ? 'bg-orange-100 text-orange-700'
        : 'bg-red-100 text-red-700'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ml-1',
            colorClass
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Bot className="h-3 w-3" />
          {pct}%
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold text-sm mb-1">AI Match Score</p>
        <p className="font-medium text-sm mb-2">Score: {pct}%</p>
        <p className="text-xs text-muted-foreground">{reasoning}</p>
      </PopoverContent>
    </Popover>
  )
}

function InterviewDetailsPopover({
  application,
  canWrite,
}: {
  application: CandidateApplicationWithDetails
  canWrite: boolean
}) {
  const updateInterview = useUpdateInterviewDetails()
  const [open, setOpen] = useState(false)
  const [interviewType, setInterviewType] = useState<'in_person' | 'online'>(
    application.interview_type || 'in_person'
  )
  const [date, setDate] = useState(application.interview_date || '')
  const [time, setTime] = useState(application.interview_time?.slice(0, 5) || '')
  const [location, setLocation] = useState(application.interview_location || '')
  const [link, setLink] = useState(application.interview_link || '')

  const hasDetails =
    application.interview_date &&
    application.interview_time &&
    application.interview_location &&
    application.interview_type

  const canSave = date && time && location

  const handleSave = () => {
    if (!canSave) return
    updateInterview.mutate(
      {
        id: application.id,
        interview_type: interviewType,
        interview_date: date,
        interview_time: time,
        interview_location: location,
        interview_link: interviewType === 'online' ? (link || null) : null,
        jobId: application.job_id,
      },
      {
        onSuccess: () => {
          setOpen(false)
          toast.success('Interview details saved')
        },
        onError: () => toast.error('Failed to save interview details'),
      }
    )
  }

  const handleTypeChange = (type: 'in_person' | 'online') => {
    setInterviewType(type)
    setLocation('')
    setLink('')
  }

  const formattedDate = application.interview_date
    ? new Date(application.interview_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null
  const formattedTime = application.interview_time
    ? application.interview_time.slice(0, 5)
    : null

  const platform = application.interview_type === 'online'
    ? getPlatformConfig(application.interview_location || '')
    : null

  return (
    <div
      className="mt-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {hasDetails ? (
            <button className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700">
              <CalendarCheck className="h-3 w-3" />
              <span>{formattedDate} at {formattedTime}</span>
              {platform ? (
                <>
                  <platform.icon className="h-3 w-3 ml-0.5" />
                  <span>{platform.label}</span>
                </>
              ) : application.interview_type === 'in_person' ? (
                <>
                  <MapPin className="h-3 w-3 ml-0.5" />
                  <span className="truncate max-w-[80px]">{application.interview_location}</span>
                </>
              ) : null}
            </button>
          ) : (
            <button className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600">
              <CalendarX2 className="h-3 w-3" />
              <span>Set interview details</span>
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <p className="font-semibold text-sm mb-3">Interview Details</p>
          <div className="space-y-3">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 text-xs"
                  disabled={!canWrite}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Time</label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-8 text-xs"
                  disabled={!canWrite}
                />
              </div>
            </div>

            {/* Type toggle */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Type</label>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    interviewType === 'in_person'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => handleTypeChange('in_person')}
                  disabled={!canWrite}
                >
                  <Building2 className="h-3 w-3" />
                  In Person
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    interviewType === 'online'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => handleTypeChange('online')}
                  disabled={!canWrite}
                >
                  <Video className="h-3 w-3" />
                  Online
                </button>
              </div>
            </div>

            {/* Location / Platform picker */}
            {interviewType === 'in_person' ? (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Location</label>
                <Input
                  type="text"
                  placeholder="Office address, room, etc."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-8 text-xs"
                  disabled={!canWrite}
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Platform</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ONLINE_PLATFORMS.map((p) => {
                    const Icon = p.icon
                    const isSelected = location === p.key
                    return (
                      <button
                        key={p.key}
                        type="button"
                        disabled={!canWrite}
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                        )}
                        onClick={() => setLocation(p.key)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {p.label}
                      </button>
                    )
                  })}
                </div>
                {/* Meeting link — shown when a platform is selected */}
                {location && (
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Meeting link (optional)</label>
                    <Input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="h-8 text-xs"
                      disabled={!canWrite}
                    />
                  </div>
                )}
              </div>
            )}

            {canWrite && (
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                disabled={!canSave || updateInterview.isPending}
                onClick={handleSave}
              >
                {updateInterview.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─── Main Card ──────────────────────────────────────────────────────────────

export function PipelineCard({ application }: PipelineCardProps) {
  const { workspace, role } = useWorkspace()
  const updateRating = useUpdateApplicationRating()

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: {
      applicationId: application.id,
      jobId: application.job_id,
      currentStageId: application.stage_id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const candidate = application.candidates
  const fullName = formatFullName(candidate.first_name, candidate.last_name)
  const canWrite = CAN_WRITE.includes(role)

  const isInterviewStage = application.pipeline_stages?.name?.toLowerCase().includes('interview')
  const missingInterview = isInterviewStage && (
    !application.interview_date || !application.interview_time || !application.interview_location || !application.interview_type
  )

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div
        className={cn(
          'mb-2 rounded-lg border p-2.5 shadow-sm select-none',
          missingInterview
            ? 'bg-red-50 border-red-200'
            : 'bg-card'
        )}
      >
        <div className="flex items-start justify-between">
          <Link
            href={`/w/${workspace.slug}/candidates/${candidate.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-[13px] leading-snug hover:underline"
          >
            {fullName}
          </Link>
          {application.ai_match_score && (
            <AiScoreBadge
              score={application.ai_match_score.score}
              reasoning={application.ai_match_score.reasoning}
            />
          )}
        </div>

        <div className="mt-1 text-[11px] text-muted-foreground">
          {formatDate(application.applied_at)}
        </div>

        {isInterviewStage && (
          <InterviewDetailsPopover application={application} canWrite={canWrite} />
        )}

        <div
          className="mt-1.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                disabled={!canWrite}
                onClick={() =>
                  canWrite &&
                  updateRating.mutate({
                    id: application.id,
                    rating: i + 1 === application.rating ? null : i + 1,
                    jobId: application.job_id,
                  })
                }
                className={cn('disabled:cursor-default', canWrite && 'cursor-pointer')}
              >
                <Star
                  className={cn(
                    'h-3 w-3',
                    i < (application.rating ?? 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

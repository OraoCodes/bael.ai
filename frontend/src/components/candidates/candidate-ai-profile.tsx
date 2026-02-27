'use client'

import { useState } from 'react'
import { Briefcase, GraduationCap, Globe, MapPin, Award, Sparkles, Calendar, Mail, Phone, Download, Loader2, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import type { Candidate, CandidateAiProfile as AiProfileType } from '@/lib/types/database'

interface CandidateAiProfileProps {
  profile: AiProfileType
  summary?: string | null
  candidate: Candidate
}

function ResumeDownloadButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(path, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch {
      console.error('Failed to generate download URL')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Download className="h-4 w-4 text-muted-foreground" />
      )}
      Download Resume
    </button>
  )
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  if (start && !end) return `${start} — Present`
  if (!start && end) return `Until ${end}`
  return `${start} — ${end}`
}

export function CandidateAiProfile({ profile, summary, candidate }: CandidateAiProfileProps) {
  // Support both new structured experience and old flat arrays
  const experience = profile.experience ?? []
  const legacyTitles = profile.job_titles ?? []
  const legacyCompanies = profile.companies ?? []
  const hasExperience = experience.length > 0 || legacyTitles.length > 0

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        {/* Contact info */}
        <div className="flex flex-col gap-2">
          {candidate.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${candidate.email}`} className="text-primary hover:underline">
                {candidate.email}
              </a>
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.resume_path ? (
            <ResumeDownloadButton path={candidate.resume_path} />
          ) : candidate.resume_url ? (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <a
                href={candidate.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Resume
              </a>
            </div>
          ) : null}
        </div>

        {summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Summary</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{summary}</p>
          </div>
        )}

        {profile.total_years_experience !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{profile.total_years_experience} years</span>
            <span className="text-muted-foreground">of experience</span>
          </div>
        )}

        {profile.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{profile.location}</span>
          </div>
        )}

        {profile.skills.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11.5px] font-medium text-blue-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasExperience && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Experience</p>
            <div className="space-y-3">
              {experience.length > 0 ? (
                experience.map((exp, i) => (
                  <div key={i} className="flex gap-2.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{exp.title}</p>
                      {exp.company && (
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {(exp.start_date || exp.end_date) && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDateRange(exp.start_date, exp.end_date)}
                          </span>
                        )}
                        {exp.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {exp.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Backward compat: old profiles with flat arrays
                legacyTitles.map((title, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{title}</span>
                    {legacyCompanies[i] && (
                      <span className="text-muted-foreground">at {legacyCompanies[i]}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {profile.education.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Education</p>
            <div className="space-y-2.5">
              {profile.education.map((edu, i) => (
                <div key={i} className="flex gap-2.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm">
                      {edu.degree && <span className="font-medium">{edu.degree}</span>}
                      {'field' in edu && edu.field && (
                        <span className="text-muted-foreground"> in {edu.field}</span>
                      )}
                    </p>
                    {edu.institution && (
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    )}
                    {edu.year && (
                      <p className="text-xs text-muted-foreground">{edu.year}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.certifications.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Certifications</p>
            <div className="space-y-1.5">
              {profile.certifications.map((cert, i) => {
                // Backward compat: old profiles store certs as strings
                const name = typeof cert === 'string' ? cert : cert.name
                const issuer = typeof cert === 'string' ? null : cert.issuer
                return (
                  <div key={i} className="flex items-start gap-2">
                    <Award className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{name}</p>
                      {issuer && (
                        <p className="text-xs text-muted-foreground">{issuer}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {profile.languages.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Languages</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11.5px] font-medium text-zinc-700"
                >
                  <Globe className="h-3 w-3" />
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

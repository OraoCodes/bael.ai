export type WorkspaceRole = 'owner' | 'admin' | 'recruiter' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'
export type JobStatus = 'draft' | 'open' | 'paused' | 'closed' | 'archived'
export type ScheduledActionType = 'reminder' | 'follow_up_email' | 'stagnation_check' | 'custom'
export type ScheduledActionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WorkspaceMembership {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  status: InvitationStatus
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface CandidateExperience {
  title: string
  company: string
  location: string | null
  start_date: string | null
  end_date: string | null // null = "Present"
}

export interface CandidateEducation {
  degree: string
  field: string | null
  institution: string
  year: number | null
}

export interface CandidateCertification {
  name: string
  issuer: string | null
}

export interface CandidateAiProfile {
  skills: string[]
  experience: CandidateExperience[]
  education: CandidateEducation[]
  certifications: CandidateCertification[]
  total_years_experience: number | null
  languages: string[]
  location: string | null
  // Deprecated — kept for backward compat with older profiles
  job_titles?: string[]
  companies?: string[]
}

export interface Candidate {
  id: string
  workspace_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  resume_url: string | null
  source: string | null
  tags: string[]
  notes: string
  metadata: Record<string, unknown>
  resume_text: string | null
  ai_profile: CandidateAiProfile | null
  ai_summary: string | null
  resume_path: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Job {
  id: string
  workspace_id: string
  title: string
  description: string
  department: string | null
  location: string | null
  employment_type: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  status: JobStatus
  assigned_to: string | null
  metadata: Record<string, unknown>
  skills: string[]
  seniority_level: string | null
  workplace_type: string | null
  job_function: string | null
  expires_at: string | null
  slug: string | null
  application_form: ApplicationFormConfig
  source_type: string
  created_by: string
  created_at: string
  updated_at: string
  closed_at: string | null
  deleted_at: string | null
}

export interface PipelineStage {
  id: string
  workspace_id: string
  name: string
  position: number
  color: string
  is_terminal: boolean
  created_at: string
  updated_at: string
}

export interface AiMatchScore {
  score: number
  reasoning: string
  computed_at: string
}

export interface CandidateApplication {
  id: string
  workspace_id: string
  candidate_id: string
  job_id: string
  stage_id: string
  assigned_to: string | null
  rating: number | null
  rejection_reason: string | null
  stage_entered_at: string
  applied_at: string
  metadata: Record<string, unknown>
  ai_match_score: AiMatchScore | null
  interview_type: 'in_person' | 'online' | null
  interview_date: string | null
  interview_time: string | null
  interview_location: string | null
  interview_link: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Activity {
  id: string
  workspace_id: string
  actor_id: string | null
  entity_type: string
  entity_id: string
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ScheduledAction {
  id: string
  workspace_id: string
  action_type: ScheduledActionType
  status: ScheduledActionStatus
  title: string
  description: string
  due_at: string
  entity_type: string | null
  entity_id: string | null
  assigned_to: string | null
  created_by: string
  payload: Record<string, unknown>
  executed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceSettings {
  id: string
  workspace_id: string
  company_size: string | null
  industry: string | null
  hiring_volume: string | null
  default_currency: string
  timezone: string
  features: Record<string, unknown>
  onboarding_completed: boolean
  public_board_enabled: boolean
  careers_page_title: string | null
  careers_page_description: string | null
  created_at: string
  updated_at: string
}

export interface RecruiterMetric {
  workspace_id: string
  recruiter_id: string
  recruiter_name: string
  total_applications: number
  total_hired: number
  active_applications: number
  avg_days_to_outcome: number | null
  stagnant_count: number
}

export interface AiJobSuggestion {
  id: string
  workspace_id: string
  job_id: string
  candidate_id: string
  score: number
  reasoning: string
  computed_at: string
  dismissed_at: string | null
  dismissed_by: string | null
  created_at: string
}

// Public job board types
export interface ApplicationFormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'select' | 'boolean'
  required: boolean
  options?: string[]
}

export interface ApplicationFormConfig {
  fields: ApplicationFormField[]
  require_phone: boolean
  require_cover_letter: boolean
  require_resume: boolean
}

export interface ApplicationAnswer {
  id: string
  application_id: string
  workspace_id: string
  field_key: string
  field_label: string
  field_type: string
  value: string | null
  created_at: string
}

// Extended types with joins
export interface CandidateApplicationWithDetails extends CandidateApplication {
  candidates: Candidate
  pipeline_stages: PipelineStage
}

export interface WorkspaceMembershipWithUser extends WorkspaceMembership {
  users: User
}

export interface InvitationWithInviter extends Invitation {
  users: User
}

export interface TelegramLink {
  id: string
  user_id: string
  workspace_id: string
  telegram_chat_id: number
  telegram_username: string | null
  linked_at: string
  unlinked_at: string | null
  created_at: string
  updated_at: string
}

export interface TelegramLinkCode {
  id: string
  user_id: string
  workspace_id: string
  code: string
  expires_at: string
  used_at: string | null
  created_at: string
}

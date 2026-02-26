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

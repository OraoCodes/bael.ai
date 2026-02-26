import type { JobStatus, InvitationStatus, ScheduledActionType, ScheduledActionStatus, WorkspaceRole } from '@/lib/types/database'

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
  archived: 'Archived',
}

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
  closed: 'bg-red-100 text-red-700',
  archived: 'bg-purple-100 text-purple-700',
}

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  revoked: 'Revoked',
}

export const INVITATION_STATUS_COLORS: Record<InvitationStatus, string> = {
  pending: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  revoked: 'bg-red-100 text-red-700',
}

export const ACTION_TYPE_LABELS: Record<ScheduledActionType, string> = {
  reminder: 'Reminder',
  follow_up_email: 'Follow-up Email',
  stagnation_check: 'Stagnation Alert',
  custom: 'Custom',
}

export const ACTION_STATUS_LABELS: Record<ScheduledActionStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export const ACTION_STATUS_COLORS: Record<ScheduledActionStatus, string> = {
  pending: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  recruiter: 'Recruiter',
  viewer: 'Viewer',
}

export const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: 'bg-yellow-100 text-yellow-700',
  admin: 'bg-blue-100 text-blue-700',
  recruiter: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
}

export const EMPLOYMENT_TYPES = [
  { label: 'Full Time', value: 'full_time' },
  { label: 'Part Time', value: 'part_time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Internship', value: 'internship' },
]

export const CANDIDATE_SOURCES = [
  { label: 'Referral', value: 'referral' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Job Board', value: 'job_board' },
  { label: 'Direct Application', value: 'direct' },
  { label: 'Agency', value: 'agency' },
  { label: 'Other', value: 'other' },
]

export const SENIORITY_LEVELS = [
  { label: 'Intern', value: 'intern' },
  { label: 'Entry Level', value: 'entry' },
  { label: 'Mid Level', value: 'mid' },
  { label: 'Senior', value: 'senior' },
  { label: 'Lead', value: 'lead' },
  { label: 'Director', value: 'director' },
  { label: 'VP', value: 'vp' },
  { label: 'C-Level', value: 'c_level' },
]

export const WORKPLACE_TYPES = [
  { label: 'On-site', value: 'on_site' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
]

export const JOB_FUNCTIONS = [
  { label: 'Engineering', value: 'engineering' },
  { label: 'Design', value: 'design' },
  { label: 'Product', value: 'product' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Sales', value: 'sales' },
  { label: 'Operations', value: 'operations' },
  { label: 'Human Resources', value: 'hr' },
  { label: 'Finance', value: 'finance' },
  { label: 'Customer Support', value: 'support' },
  { label: 'Other', value: 'other' },
]

export const CAN_WRITE: WorkspaceRole[] = ['owner', 'admin', 'recruiter']
export const CAN_ADMIN: WorkspaceRole[] = ['owner', 'admin']

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Job, Workspace, WorkspaceSettings, ApplicationFormConfig } from '@/lib/types/database'

export interface PublicJob {
  id: string
  title: string
  slug: string
  department: string | null
  location: string | null
  employment_type: string | null
  workplace_type: string | null
  job_function: string | null
  seniority_level: string | null
  created_at: string
}

export interface PublicJobDetail extends PublicJob {
  description: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  skills: string[]
  application_form: ApplicationFormConfig
  workspace_id: string
}

export interface PublicWorkspace {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export interface PublicBoardConfig {
  careers_page_title: string | null
  careers_page_description: string | null
}

export async function fetchWorkspaceBySlug(
  slug: string
): Promise<{ workspace: PublicWorkspace; boardConfig: PublicBoardConfig } | null> {
  const supabase = await createServerSupabaseClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!workspace) return null

  const { data: settings } = await supabase
    .from('workspace_settings')
    .select('public_board_enabled, careers_page_title, careers_page_description')
    .eq('workspace_id', workspace.id)
    .single()

  if (!settings?.public_board_enabled) return null

  return {
    workspace: workspace as PublicWorkspace,
    boardConfig: {
      careers_page_title: settings.careers_page_title,
      careers_page_description: settings.careers_page_description,
    },
  }
}

export async function fetchPublicJobs(workspaceSlug: string): Promise<PublicJob[]> {
  const supabase = await createServerSupabaseClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .single()

  if (!workspace) return []

  const { data: jobs } = await supabase
    .from('jobs')
    .select(
      'id, title, slug, department, location, employment_type, workplace_type, job_function, seniority_level, created_at'
    )
    .eq('workspace_id', workspace.id)
    .eq('status', 'open')
    .is('deleted_at', null)
    .order('department', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  return (jobs ?? []) as PublicJob[]
}

export async function fetchPublicJob(
  workspaceSlug: string,
  jobSlug: string
): Promise<{ job: PublicJobDetail; workspace: PublicWorkspace } | null> {
  const supabase = await createServerSupabaseClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .single()

  if (!workspace) return null

  const { data: job } = await supabase
    .from('jobs')
    .select(
      'id, title, slug, description, department, location, employment_type, workplace_type, job_function, seniority_level, salary_min, salary_max, salary_currency, skills, application_form, workspace_id, created_at'
    )
    .eq('workspace_id', workspace.id)
    .eq('slug', jobSlug)
    .eq('status', 'open')
    .is('deleted_at', null)
    .single()

  if (!job) return null

  return {
    job: job as unknown as PublicJobDetail,
    workspace: workspace as PublicWorkspace,
  }
}

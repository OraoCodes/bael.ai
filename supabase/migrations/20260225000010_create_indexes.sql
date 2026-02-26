-- =============================================================================
-- Migration: All non-PK, non-unique-constraint indexes
-- =============================================================================

-- candidates
CREATE INDEX idx_candidates_workspace ON public.candidates (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_workspace_name ON public.candidates (workspace_id, last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_tags ON public.candidates USING GIN (tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_metadata ON public.candidates USING GIN (metadata) WHERE deleted_at IS NULL;

-- jobs
CREATE INDEX idx_jobs_workspace_status ON public.jobs (workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_workspace_assigned ON public.jobs (workspace_id, assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_metadata ON public.jobs USING GIN (metadata) WHERE deleted_at IS NULL;

-- pipeline_stages
CREATE INDEX idx_pipeline_stages_workspace ON public.pipeline_stages (workspace_id, position);

-- candidate_applications
CREATE INDEX idx_applications_workspace_job ON public.candidate_applications (workspace_id, job_id, stage_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_workspace_candidate ON public.candidate_applications (workspace_id, candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_stage_entered ON public.candidate_applications (workspace_id, stage_id, stage_entered_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_assigned ON public.candidate_applications (workspace_id, assigned_to) WHERE deleted_at IS NULL;

-- activities
CREATE INDEX idx_activities_workspace_time ON public.activities (workspace_id, created_at DESC);
CREATE INDEX idx_activities_workspace_entity ON public.activities (workspace_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activities_workspace_actor ON public.activities (workspace_id, actor_id, created_at DESC);

-- scheduled_actions
CREATE INDEX idx_scheduled_pending ON public.scheduled_actions (due_at, status) WHERE status = 'pending';
CREATE INDEX idx_scheduled_workspace ON public.scheduled_actions (workspace_id, assigned_to, status, due_at) WHERE status = 'pending';
CREATE INDEX idx_scheduled_entity ON public.scheduled_actions (workspace_id, entity_type, entity_id);

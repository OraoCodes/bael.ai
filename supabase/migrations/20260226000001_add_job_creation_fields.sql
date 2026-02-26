-- Add new columns to jobs table for the job creation wizard
ALTER TABLE public.jobs
  ADD COLUMN skills          TEXT[] DEFAULT '{}',
  ADD COLUMN seniority_level TEXT,
  ADD COLUMN workplace_type  TEXT,
  ADD COLUMN job_function    TEXT,
  ADD COLUMN expires_at      TIMESTAMPTZ,
  ADD COLUMN source_type     TEXT DEFAULT 'manual';

-- GIN index for skills array containment queries
CREATE INDEX idx_jobs_skills ON public.jobs USING GIN (skills) WHERE deleted_at IS NULL;

-- Index for auto-expiry cron (find open jobs past deadline)
CREATE INDEX idx_jobs_expires ON public.jobs (workspace_id, expires_at)
  WHERE deleted_at IS NULL AND expires_at IS NOT NULL AND status = 'open';

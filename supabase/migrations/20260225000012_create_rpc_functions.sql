-- =============================================================================
-- Migration: RPC functions used by Edge Functions
-- =============================================================================

-- Fetch due scheduled actions with row-level locking (FOR UPDATE SKIP LOCKED)
-- Prevents duplicate processing when cron invocations overlap.
CREATE OR REPLACE FUNCTION public.fetch_due_scheduled_actions(batch_size INTEGER DEFAULT 50)
RETURNS SETOF public.scheduled_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT sa.*
    FROM public.scheduled_actions sa
    WHERE sa.status = 'pending'
      AND sa.due_at <= now()
    ORDER BY sa.due_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;
END;
$$;

-- Detect stagnant applications across all workspaces
-- Used by the detect-stagnation Edge Function cron.
CREATE OR REPLACE FUNCTION public.detect_stagnant_applications(
    default_threshold_days INTEGER DEFAULT 7,
    cooldown_days INTEGER DEFAULT 3
)
RETURNS TABLE (
    application_id UUID,
    workspace_id UUID,
    candidate_id UUID,
    candidate_name TEXT,
    job_id UUID,
    job_title TEXT,
    stage_id UUID,
    stage_name TEXT,
    assigned_to UUID,
    stage_entered_at TIMESTAMPTZ,
    days_in_stage INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ca.id AS application_id,
        ca.workspace_id,
        ca.candidate_id,
        c.first_name || ' ' || c.last_name AS candidate_name,
        ca.job_id,
        j.title AS job_title,
        ca.stage_id,
        ps.name AS stage_name,
        ca.assigned_to,
        ca.stage_entered_at,
        EXTRACT(DAY FROM now() - ca.stage_entered_at)::INTEGER AS days_in_stage
    FROM public.candidate_applications ca
    JOIN public.pipeline_stages ps ON ps.id = ca.stage_id
    JOIN public.workspace_settings ws ON ws.workspace_id = ca.workspace_id
    JOIN public.candidates c ON c.id = ca.candidate_id
    JOIN public.jobs j ON j.id = ca.job_id
    WHERE ca.deleted_at IS NULL
      AND ps.is_terminal = false
      AND ca.assigned_to IS NOT NULL
      AND EXTRACT(DAY FROM now() - ca.stage_entered_at) >=
          COALESCE((ws.features->>'stagnation_threshold_days')::INTEGER, default_threshold_days)
      AND NOT EXISTS (
          SELECT 1 FROM public.scheduled_actions sa
          WHERE sa.entity_id = ca.id
            AND sa.action_type = 'stagnation_check'
            AND sa.created_at > now() - (cooldown_days || ' days')::INTERVAL
      );
$$;

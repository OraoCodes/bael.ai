-- =============================================================================
-- Migration: AI Job Suggestions for dashboard insights
-- Stores AI-generated candidate-job match suggestions for candidates who
-- haven't applied yet, enabling the proactive "AI Insights" dashboard section.
-- =============================================================================

CREATE TABLE public.ai_job_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id    UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    score           NUMERIC(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
    reasoning       TEXT NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    dismissed_at    TIMESTAMPTZ DEFAULT NULL,
    dismissed_by    UUID REFERENCES public.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(workspace_id, job_id, candidate_id)
);

ALTER TABLE public.ai_job_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies (follows candidates/candidate_applications pattern)

CREATE POLICY "AI suggestions: select for members" ON public.ai_job_suggestions
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

CREATE POLICY "AI suggestions: insert" ON public.ai_job_suggestions
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "AI suggestions: update" ON public.ai_job_suggestions
    FOR UPDATE
    USING (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    )
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "AI suggestions: delete for owner/admin" ON public.ai_job_suggestions
    FOR DELETE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- Primary dashboard query index: active suggestions for a workspace+job, sorted by score
CREATE INDEX idx_ai_suggestions_workspace_job
    ON public.ai_job_suggestions (workspace_id, job_id, score DESC)
    WHERE dismissed_at IS NULL;

-- Staleness check index
CREATE INDEX idx_ai_suggestions_workspace_computed
    ON public.ai_job_suggestions (workspace_id, computed_at DESC);

-- Lookup by candidate (for cleanup when candidate is dismissed across jobs)
CREATE INDEX idx_ai_suggestions_candidate
    ON public.ai_job_suggestions (workspace_id, candidate_id)
    WHERE dismissed_at IS NULL;

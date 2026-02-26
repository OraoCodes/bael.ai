-- =============================================================================
-- Migration: CRM tables (candidates, jobs, pipeline_stages, applications)
-- =============================================================================

-- Candidates (workspace-scoped)
CREATE TABLE public.candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    linkedin_url    TEXT,
    resume_url      TEXT,
    source          TEXT,
    tags            TEXT[] DEFAULT '{}',
    notes           TEXT DEFAULT '',
    metadata        JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES public.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Unique email per workspace (among active candidates with non-null email)
CREATE UNIQUE INDEX idx_candidates_workspace_email_unique
    ON public.candidates (workspace_id, email)
    WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Jobs (workspace-scoped)
CREATE TABLE public.jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    department      TEXT,
    location        TEXT,
    employment_type TEXT,
    salary_min      INTEGER,
    salary_max      INTEGER,
    salary_currency TEXT DEFAULT 'USD',
    status          public.job_status NOT NULL DEFAULT 'draft',
    assigned_to     UUID REFERENCES public.users(id),
    metadata        JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES public.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- Pipeline stages (workspace-scoped, ordered)
CREATE TABLE public.pipeline_stages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    position        INTEGER NOT NULL,
    color           TEXT DEFAULT '#6B7280',
    is_terminal     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (workspace_id, position),
    UNIQUE (workspace_id, name)
);

-- Candidate applications (links candidate → job → current pipeline stage)
CREATE TABLE public.candidate_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    candidate_id    UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    stage_id        UUID NOT NULL REFERENCES public.pipeline_stages(id),
    assigned_to     UUID REFERENCES public.users(id),
    rating          SMALLINT CHECK (rating >= 1 AND rating <= 5),
    rejection_reason TEXT,
    stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata        JSONB DEFAULT '{}',
    ai_match_score  JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE (workspace_id, candidate_id, job_id)
);

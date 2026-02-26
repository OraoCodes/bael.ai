-- =============================================================================
-- Migration: Workspace settings (onboarding wizard outputs, per-workspace config)
-- =============================================================================

CREATE TABLE public.workspace_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    company_size    TEXT,
    industry        TEXT,
    hiring_volume   TEXT,
    default_currency TEXT DEFAULT 'USD',
    timezone        TEXT DEFAULT 'UTC',
    features        JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_workspace_settings_workspace ON public.workspace_settings (workspace_id);

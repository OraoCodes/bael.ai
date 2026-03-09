-- =============================================================================
-- Migration: Gmail Inbox Integration
-- Tables: gmail_links, email_ingestion_logs
-- RPC: fetch_due_gmail_syncs
-- =============================================================================

-- ── gmail_links ───────────────────────────────────────────────────────────────
-- Persistent association: platform user + workspace ↔ Gmail inbox.
-- Stores OAuth tokens for reading emails and sending replies.
-- Soft-delete via unlinked_at.

CREATE TABLE public.gmail_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    gmail_address       TEXT NOT NULL,
    access_token        TEXT NOT NULL,
    refresh_token       TEXT NOT NULL,
    token_expires_at    TIMESTAMPTZ NOT NULL,
    label_id            TEXT,
    sync_enabled        BOOLEAN NOT NULL DEFAULT true,
    last_synced_at      TIMESTAMPTZ,
    last_error          TEXT,
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlinked_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, workspace_id)
);

ALTER TABLE public.gmail_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_gmail_links_user_workspace
    ON public.gmail_links (user_id, workspace_id)
    WHERE unlinked_at IS NULL;

CREATE INDEX idx_gmail_links_active_sync
    ON public.gmail_links (sync_enabled, last_synced_at)
    WHERE unlinked_at IS NULL AND sync_enabled = true;

-- ── email_ingestion_logs ──────────────────────────────────────────────────────
-- Tracks every email processed by the inbound email cron.
-- Provides visibility into what was ingested and any errors.

CREATE TYPE public.email_ingestion_status AS ENUM (
    'processing',
    'created',
    'updated',
    'duplicate_app',
    'no_cv_replied',
    'no_match',
    'failed'
);

CREATE TABLE public.email_ingestion_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    gmail_link_id       UUID NOT NULL REFERENCES public.gmail_links(id) ON DELETE CASCADE,
    gmail_message_id    TEXT NOT NULL,
    gmail_thread_id     TEXT,
    from_email          TEXT NOT NULL,
    from_name           TEXT,
    subject             TEXT,
    status              public.email_ingestion_status NOT NULL DEFAULT 'processing',
    candidate_id        UUID REFERENCES public.candidates(id),
    job_id              UUID REFERENCES public.jobs(id),
    application_id      UUID REFERENCES public.candidate_applications(id),
    ai_match_confidence FLOAT,
    ai_match_reasoning  TEXT,
    error_message       TEXT,
    metadata            JSONB DEFAULT '{}',
    processed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_ingestion_gmail_msg
    ON public.email_ingestion_logs (gmail_link_id, gmail_message_id);

CREATE INDEX idx_ingestion_workspace_status
    ON public.email_ingestion_logs (workspace_id, status, created_at DESC);

CREATE INDEX idx_ingestion_candidate
    ON public.email_ingestion_logs (candidate_id)
    WHERE candidate_id IS NOT NULL;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

-- gmail_links: user sees own; owner/admin sees all in workspace
CREATE POLICY "Gmail links: select own or admin"
    ON public.gmail_links FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.get_my_role(workspace_id) IN ('owner', 'admin')
    );

-- gmail_links: user can update (unlink, toggle sync) their own row
CREATE POLICY "Gmail links: update own"
    ON public.gmail_links FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- email_ingestion_logs: workspace members can view
CREATE POLICY "Ingestion logs: select members"
    ON public.email_ingestion_logs FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- ── RPC: Cron batch fetch ─────────────────────────────────────────────────────
-- Returns active gmail_links that are due for sync.
-- Uses FOR UPDATE SKIP LOCKED to prevent concurrent cron overlap.

CREATE OR REPLACE FUNCTION public.fetch_due_gmail_syncs(batch_size INTEGER DEFAULT 20)
RETURNS SETOF public.gmail_links
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.gmail_links
    WHERE unlinked_at IS NULL
      AND sync_enabled = true
      AND (last_synced_at IS NULL OR last_synced_at < now() - INTERVAL '2 minutes')
    ORDER BY last_synced_at ASC NULLS FIRST
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;
$$;

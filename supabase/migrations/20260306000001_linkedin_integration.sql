-- =============================================================================
-- Migration: LinkedIn Integration
-- Tables: linkedin_links, linkedin_shares
-- =============================================================================

-- ── linkedin_links ──────────────────────────────────────────────────────────
-- Persistent association: platform user + workspace ↔ LinkedIn account.
-- Stores OAuth tokens for posting on behalf of the user.
-- Soft-delete via unlinked_at.

CREATE TABLE public.linkedin_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    linkedin_profile_id TEXT NOT NULL,
    linkedin_name       TEXT,
    access_token        TEXT NOT NULL,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ NOT NULL,
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlinked_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, workspace_id)
);

ALTER TABLE public.linkedin_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_li_links_user_workspace
    ON public.linkedin_links (user_id, workspace_id)
    WHERE unlinked_at IS NULL;

-- ── linkedin_shares ─────────────────────────────────────────────────────────
-- Log of jobs shared to LinkedIn. Tracks post IDs for reference.

CREATE TABLE public.linkedin_shares (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    job_id           UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    shared_by        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    linkedin_post_id TEXT,
    shared_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_li_shares_job
    ON public.linkedin_shares (job_id, workspace_id);

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- linkedin_links: user sees own; owner/admin sees all in workspace
CREATE POLICY "Li links: select own or admin"
    ON public.linkedin_links FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.get_my_role(workspace_id) IN ('owner', 'admin')
    );

-- linkedin_links: user can update (unlink) their own row
CREATE POLICY "Li links: update own"
    ON public.linkedin_links FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- linkedin_shares: workspace members can view
CREATE POLICY "Li shares: select members"
    ON public.linkedin_shares FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- =============================================================================
-- Migration: Telegram Bot Integration
-- Tables: telegram_link_codes, telegram_links, telegram_sessions
-- =============================================================================

-- ── telegram_link_codes ─────────────────────────────────────────────────────
-- Ephemeral 6-char codes for linking a Telegram chat to a platform user.
-- Single-use, expire after 10 minutes.

CREATE TABLE public.telegram_link_codes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code         TEXT NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
    used_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_tg_link_codes_code
    ON public.telegram_link_codes (code)
    WHERE used_at IS NULL;

CREATE INDEX idx_tg_link_codes_user
    ON public.telegram_link_codes (user_id, workspace_id, expires_at DESC)
    WHERE used_at IS NULL;

-- ── telegram_links ──────────────────────────────────────────────────────────
-- Persistent association: platform user + workspace ↔ Telegram chat_id.
-- Soft-delete via unlinked_at.

CREATE TABLE public.telegram_links (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    telegram_chat_id  BIGINT NOT NULL,
    telegram_username TEXT,
    linked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlinked_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, workspace_id)
);

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_tg_links_chat_workspace
    ON public.telegram_links (telegram_chat_id, workspace_id)
    WHERE unlinked_at IS NULL;

CREATE INDEX idx_tg_links_user_workspace
    ON public.telegram_links (user_id, workspace_id)
    WHERE unlinked_at IS NULL;

-- ── telegram_sessions ───────────────────────────────────────────────────────
-- Mutable per-chat session: tracks active job context + rate limiting.

CREATE TABLE public.telegram_sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id   BIGINT NOT NULL UNIQUE,
    user_id            UUID REFERENCES public.users(id) ON DELETE SET NULL,
    workspace_id       UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    last_job_id        UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    last_activity_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    rate_window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
    rate_request_count INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tg_sessions_user
    ON public.telegram_sessions (user_id)
    WHERE user_id IS NOT NULL;

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- telegram_link_codes: user can only see their own codes
CREATE POLICY "Tg link codes: select own"
    ON public.telegram_link_codes FOR SELECT
    USING (user_id = auth.uid());

-- telegram_links: user sees own; owner/admin sees all in workspace
CREATE POLICY "Tg links: select own or admin"
    ON public.telegram_links FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.get_my_role(workspace_id) IN ('owner', 'admin')
    );

-- telegram_links: user can update (unlink) their own row
CREATE POLICY "Tg links: update own"
    ON public.telegram_links FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- telegram_sessions: no authenticated policies (service_role only)

-- =============================================================================
-- Migration: Workspaces, memberships, and invitations
-- =============================================================================

-- Workspaces
CREATE TABLE public.workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    logo_url        TEXT,
    created_by      UUID NOT NULL REFERENCES public.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Partial unique index: slug uniqueness only among active workspaces
CREATE UNIQUE INDEX idx_workspaces_slug_active
    ON public.workspaces (slug) WHERE deleted_at IS NULL;

-- Workspace memberships (junction table with roles)
CREATE TABLE public.workspace_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role            public.workspace_role NOT NULL DEFAULT 'recruiter',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_memberships_user ON public.workspace_memberships (user_id);
CREATE INDEX idx_memberships_workspace_role ON public.workspace_memberships (workspace_id, role);

-- Invitations
CREATE TABLE public.invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    role            public.workspace_role NOT NULL DEFAULT 'recruiter',
    status          public.invitation_status NOT NULL DEFAULT 'pending',
    invited_by      UUID NOT NULL REFERENCES public.users(id),
    token           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one pending invitation per email per workspace
CREATE UNIQUE INDEX idx_invitations_pending_unique
    ON public.invitations (workspace_id, email)
    WHERE status = 'pending';

CREATE INDEX idx_invitations_token ON public.invitations (token) WHERE status = 'pending';
CREATE INDEX idx_invitations_email ON public.invitations (email) WHERE status = 'pending';
CREATE INDEX idx_invitations_workspace ON public.invitations (workspace_id, status);

-- =============================================================================
-- Migration: Scheduled actions (reminders, follow-ups, stagnation checks)
-- =============================================================================

CREATE TABLE public.scheduled_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    action_type     public.scheduled_action_type NOT NULL,
    status          public.scheduled_action_status NOT NULL DEFAULT 'pending',
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    due_at          TIMESTAMPTZ NOT NULL,
    entity_type     TEXT,
    entity_id       UUID,
    assigned_to     UUID REFERENCES public.users(id),
    created_by      UUID NOT NULL REFERENCES public.users(id),
    payload         JSONB DEFAULT '{}',
    executed_at     TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

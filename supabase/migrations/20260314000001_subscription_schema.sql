-- ─── Subscription Plans (reference table) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL DEFAULT '',
  price_cents     INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'usd',
  candidate_limit INTEGER,            -- NULL = unlimited
  team_member_limit INTEGER,          -- NULL = unlimited
  features        JSONB NOT NULL DEFAULT '{}',
  position        INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed plans
INSERT INTO public.subscription_plans (id, name, price_cents, candidate_limit, team_member_limit, features, position, stripe_price_id) VALUES
  ('starter',    'Starter',    4900,  50,   3,    '{"ai_matching":true,"ai_search":true,"gmail_integration":true,"linkedin_integration":true,"telegram_integration":true,"advanced_analytics":false,"custom_pipeline":true,"public_board":true,"api_access":false}', 1, 'price_1TAwg0AsRwGVbyYqdFyuQ6wO'),
  ('pro',        'Pro',        9900,  100,  10,   '{"ai_matching":true,"ai_search":true,"gmail_integration":true,"linkedin_integration":true,"telegram_integration":true,"advanced_analytics":false,"custom_pipeline":true,"public_board":true,"api_access":false}', 2, 'price_1TAwgOAsRwGVbyYq26VqSPDb'),
  ('enterprise', 'Enterprise', 19900, NULL, NULL, '{"ai_matching":true,"ai_search":true,"gmail_integration":true,"linkedin_integration":true,"telegram_integration":true,"advanced_analytics":true,"custom_pipeline":true,"public_board":true,"api_access":true}', 3, 'price_1TAwgwAsRwGVbyYqLYHnPEdx')
ON CONFLICT (id) DO NOTHING;

-- ─── Workspace Subscriptions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id                 TEXT NOT NULL REFERENCES public.subscription_plans(id),
  stripe_customer_id      TEXT NOT NULL DEFAULT '',
  stripe_subscription_id  TEXT,
  status                  TEXT NOT NULL DEFAULT 'trialing'
                          CHECK (status IN ('trialing','active','past_due','canceled','expired','paused')),
  trial_starts_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at           TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  canceled_at             TIMESTAMPTZ,
  grace_period_ends_at    TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_ws_sub_stripe_customer ON public.workspace_subscriptions (stripe_customer_id) WHERE stripe_customer_id != '';
CREATE INDEX IF NOT EXISTS idx_ws_sub_stripe_sub ON public.workspace_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ws_sub_status ON public.workspace_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_ws_sub_trial_ends ON public.workspace_subscriptions (trial_ends_at) WHERE status = 'trialing';

-- ─── Billing Events (audit log) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_workspace ON public.billing_events (workspace_id, created_at DESC);

-- ─── Workspace Usage (materialized candidate count) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_usage (
  workspace_id    UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Candidate Count Trigger ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_candidate_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    INSERT INTO public.workspace_usage (workspace_id, candidate_count, updated_at)
    VALUES (NEW.workspace_id, 1, now())
    ON CONFLICT (workspace_id) DO UPDATE
      SET candidate_count = workspace_usage.candidate_count + 1,
          updated_at = now();

  ELSIF TG_OP = 'UPDATE' THEN
    -- Soft delete: active → deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.workspace_usage
      SET candidate_count = GREATEST(candidate_count - 1, 0), updated_at = now()
      WHERE workspace_id = NEW.workspace_id;
    -- Undelete: deleted → active
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      INSERT INTO public.workspace_usage (workspace_id, candidate_count, updated_at)
      VALUES (NEW.workspace_id, 1, now())
      ON CONFLICT (workspace_id) DO UPDATE
        SET candidate_count = workspace_usage.candidate_count + 1,
            updated_at = now();
    END IF;

  ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
    UPDATE public.workspace_usage
    SET candidate_count = GREATEST(candidate_count - 1, 0), updated_at = now()
    WHERE workspace_id = OLD.workspace_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_candidate_count ON public.candidates;
CREATE TRIGGER trg_candidate_count
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.update_candidate_count();

-- ─── Backfill usage for existing workspaces ───────────────────────────────────
INSERT INTO public.workspace_usage (workspace_id, candidate_count)
SELECT workspace_id, COUNT(*)
FROM public.candidates
WHERE deleted_at IS NULL
GROUP BY workspace_id
ON CONFLICT (workspace_id) DO UPDATE
  SET candidate_count = EXCLUDED.candidate_count,
      updated_at = now();

-- ─── Grandfather existing workspaces with 30-day Pro trial ──────────────────
INSERT INTO public.workspace_subscriptions (workspace_id, plan_id, status, trial_starts_at, trial_ends_at)
SELECT id, 'pro', 'trialing', now(), now() + INTERVAL '30 days'
FROM public.workspaces
WHERE deleted_at IS NULL
  AND id NOT IN (SELECT workspace_id FROM public.workspace_subscriptions)
ON CONFLICT (workspace_id) DO NOTHING;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

-- subscription_plans: anyone authenticated can read
CREATE POLICY "subscription_plans_select" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

-- workspace_subscriptions: members can read their own workspace's subscription
CREATE POLICY "workspace_subscriptions_select" ON public.workspace_subscriptions
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- billing_events: only owner/admin can read
CREATE POLICY "billing_events_select" ON public.billing_events
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT public.get_my_workspace_ids())
    AND public.get_my_role(workspace_id) IN ('owner', 'admin')
  );

-- workspace_usage: members can read
CREATE POLICY "workspace_usage_select" ON public.workspace_usage
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- ─── Helper: can_add_candidate ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_add_candidate(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
  v_count INTEGER;
BEGIN
  -- Get active subscription
  SELECT * INTO v_subscription
  FROM public.workspace_subscriptions
  WHERE workspace_id = p_workspace_id
    AND status IN ('trialing', 'active', 'past_due')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'no_active_subscription',
      'current_count', 0,
      'limit', 0
    );
  END IF;

  -- Get plan
  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id = v_subscription.plan_id;

  -- Unlimited plan
  IF v_plan.candidate_limit IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'unlimited',
      'current_count', 0,
      'limit', NULL
    );
  END IF;

  -- Get current count
  SELECT COALESCE(candidate_count, 0) INTO v_count
  FROM public.workspace_usage
  WHERE workspace_id = p_workspace_id;

  IF v_count >= v_plan.candidate_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'limit_reached',
      'current_count', v_count,
      'limit', v_plan.candidate_limit
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'current_count', v_count,
    'limit', v_plan.candidate_limit
  );
END;
$$;

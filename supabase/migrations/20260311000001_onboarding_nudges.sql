-- =============================================================================
-- Migration: Onboarding nudge emails for users who sign up but don't create
-- a workspace. Sends a series of reminder emails to encourage onboarding.
-- =============================================================================

-- Nudge schedule: 1 hour, 24 hours, 72 hours after sign-up
CREATE TYPE public.nudge_step AS ENUM ('1h', '24h', '72h');

CREATE TABLE public.onboarding_nudges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    step        public.nudge_step NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'cancelled')),
    send_at     TIMESTAMPTZ NOT NULL,
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For the cron query: find pending nudges that are due
CREATE INDEX idx_onboarding_nudges_due
    ON public.onboarding_nudges(send_at)
    WHERE status = 'pending';

-- For cancellation: find pending nudges by user
CREATE INDEX idx_onboarding_nudges_user_pending
    ON public.onboarding_nudges(user_id)
    WHERE status = 'pending';

-- Prevent duplicate nudge steps per user
CREATE UNIQUE INDEX idx_onboarding_nudges_user_step
    ON public.onboarding_nudges(user_id, step);

-- ─── Trigger: schedule nudges on new user sign-up ────────────────────────────

CREATE OR REPLACE FUNCTION public.schedule_onboarding_nudges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only on INSERT (new sign-up), not on UPDATE
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.onboarding_nudges (user_id, step, send_at) VALUES
            (NEW.id, '1h',  now() + interval '1 hour'),
            (NEW.id, '24h', now() + interval '24 hours'),
            (NEW.id, '72h', now() + interval '72 hours');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_schedule_nudges
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.schedule_onboarding_nudges();

-- ─── Function: cancel nudges (called when user creates a workspace) ──────────

CREATE OR REPLACE FUNCTION public.cancel_onboarding_nudges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.onboarding_nudges
    SET status = 'cancelled'
    WHERE user_id = p_user_id
      AND status = 'pending';
END;
$$;

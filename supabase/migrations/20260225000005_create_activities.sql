-- =============================================================================
-- Migration: Activities table (append-only audit log) + audit triggers
-- =============================================================================

CREATE TABLE public.activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES public.users(id),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activities IS 'Append-only audit log. No UPDATE or DELETE allowed.';

-- =============================================================================
-- Generic audit trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_action TEXT;
    v_entity_type TEXT;
    v_workspace_id UUID;
    v_entity_id UUID;
    v_actor_id UUID;
    v_metadata JSONB;
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_new_data := to_jsonb(NEW);
        v_entity_id := NEW.id;
        v_workspace_id := NEW.workspace_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            v_action := 'deleted';
        ELSE
            v_action := 'updated';
        END IF;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_entity_id := NEW.id;
        v_workspace_id := NEW.workspace_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'hard_deleted';
        v_old_data := to_jsonb(OLD);
        v_entity_id := OLD.id;
        v_workspace_id := OLD.workspace_id;
    END IF;

    v_entity_type := TG_TABLE_NAME;

    -- Get current user (NULL for system/trigger operations without auth context)
    v_actor_id := auth.uid();

    -- Build metadata: for updates, capture only changed fields
    IF TG_OP = 'UPDATE' THEN
        v_metadata := jsonb_build_object(
            'changes', (
                SELECT jsonb_object_agg(key, jsonb_build_object('old', v_old_data->key, 'new', value))
                FROM jsonb_each(v_new_data)
                WHERE v_old_data->key IS DISTINCT FROM value
                  AND key NOT IN ('updated_at')
            )
        );
    ELSE
        v_metadata := COALESCE(v_new_data, v_old_data);
    END IF;

    INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (v_workspace_id, v_actor_id, v_entity_type, v_entity_id, v_action, v_metadata);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- Stage change tracking trigger (BEFORE UPDATE, modifies stage_entered_at)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (
            NEW.workspace_id,
            auth.uid(),
            'candidate_applications',
            NEW.id,
            'stage_changed',
            jsonb_build_object(
                'candidate_id', NEW.candidate_id,
                'job_id', NEW.job_id,
                'from_stage_id', OLD.stage_id,
                'to_stage_id', NEW.stage_id,
                'time_in_previous_stage_seconds', EXTRACT(EPOCH FROM (now() - OLD.stage_entered_at))::INTEGER
            )
        );
        -- Reset stage_entered_at for the new stage
        NEW.stage_entered_at := now();
    END IF;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- Attach triggers to audited tables
-- =============================================================================

-- Stage change tracking (BEFORE trigger to modify NEW)
CREATE TRIGGER track_stage_change
    BEFORE UPDATE ON public.candidate_applications
    FOR EACH ROW EXECUTE FUNCTION public.log_stage_change();

-- General audit triggers (AFTER triggers for logging)
CREATE TRIGGER audit_candidates
    AFTER INSERT OR UPDATE OR DELETE ON public.candidates
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER audit_jobs
    AFTER INSERT OR UPDATE OR DELETE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER audit_candidate_applications
    AFTER INSERT OR UPDATE OR DELETE ON public.candidate_applications
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER audit_invitations
    AFTER INSERT OR UPDATE ON public.invitations
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Exclude AI-internal columns (embedding, resume_text) from activity change tracking.
-- These columns are written by background edge functions running as the service role,
-- producing noisy "System updated a candidate" entries with no meaningful user context.
-- If only these columns changed, skip logging the activity entirely.

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
    v_changes JSONB;
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

    -- Get current user (NULL for service-role operations without auth context)
    v_actor_id := auth.uid();

    -- Build metadata
    IF TG_OP = 'UPDATE' THEN
        -- Capture only changed fields, excluding internal/AI columns and updated_at
        v_changes := (
            SELECT jsonb_object_agg(key, jsonb_build_object('old', v_old_data->key, 'new', value))
            FROM jsonb_each(v_new_data)
            WHERE v_old_data->key IS DISTINCT FROM value
              AND key NOT IN ('updated_at', 'embedding', 'resume_text')
        );

        -- Skip logging if nothing meaningful changed (only AI-internal columns were updated)
        IF v_changes IS NULL OR v_changes = '{}'::jsonb THEN
            RETURN NEW;
        END IF;

        v_metadata := jsonb_build_object('changes', v_changes);
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

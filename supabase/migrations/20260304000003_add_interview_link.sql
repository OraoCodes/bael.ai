-- Add interview_link column for storing online meeting URLs
ALTER TABLE public.candidate_applications
  ADD COLUMN interview_link TEXT;

-- Exclude interview_link from activity log trigger to avoid noise
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action     TEXT;
  v_actor_id   UUID;
  v_entity_id  UUID;
  v_meta       JSONB := '{}'::JSONB;
  v_diff       JSONB;
  v_excluded   TEXT[] := ARRAY[
    'updated_at','created_at','deleted_at',
    'resume_text','resume_path','ai_profile','ai_summary','embedding',
    'interview_date','interview_time','interview_location','interview_type','interview_link'
  ];
  k            TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Skip job_board sourced inserts (handled manually in edge function)
    IF TG_TABLE_NAME = 'candidates' AND (to_jsonb(NEW)->>'source') = 'job_board' THEN
      RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'candidate_applications' AND (to_jsonb(NEW)->'metadata'->>'source') = 'job_board' THEN
      RETURN NEW;
    END IF;

    v_action    := 'created';
    v_actor_id  := (to_jsonb(NEW)->>'created_by')::UUID;
    v_entity_id := (to_jsonb(NEW)->>'id')::UUID;

  ELSIF TG_OP = 'UPDATE' THEN
    v_diff := '{}'::JSONB;
    FOR k IN SELECT key FROM jsonb_each(to_jsonb(NEW)) LOOP
      CONTINUE WHEN k = ANY(v_excluded);
      IF (to_jsonb(OLD)->>k) IS DISTINCT FROM (to_jsonb(NEW)->>k) THEN
        v_diff := v_diff || jsonb_build_object(k, to_jsonb(NEW)->k);
      END IF;
    END LOOP;

    -- Skip if nothing meaningful changed
    IF v_diff = '{}'::JSONB THEN
      RETURN NEW;
    END IF;

    v_action    := 'updated';
    v_actor_id  := auth.uid();
    v_entity_id := (to_jsonb(NEW)->>'id')::UUID;
    v_meta      := jsonb_build_object('changes', v_diff);

  ELSIF TG_OP = 'DELETE' THEN
    v_action    := 'deleted';
    v_actor_id  := auth.uid();
    v_entity_id := (to_jsonb(OLD)->>'id')::UUID;
  END IF;

  INSERT INTO public.activities (
    workspace_id, actor_id, entity_type, entity_id, action, metadata
  ) VALUES (
    (to_jsonb(COALESCE(NEW, OLD))->>'workspace_id')::UUID,
    v_actor_id,
    TG_TABLE_NAME,
    v_entity_id,
    v_action,
    v_meta
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

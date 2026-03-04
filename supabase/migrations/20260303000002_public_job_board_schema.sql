-- =============================================================================
-- Migration: Public Job Board Schema
-- Adds slug + application_form to jobs, public_board settings,
-- application_answers table, anon RLS policies, and slug auto-generation.
-- =============================================================================

-- 1. Add slug and application_form to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS application_form JSONB DEFAULT '{"fields": [], "require_phone": false, "require_cover_letter": false, "require_resume": true}';

-- Unique slug per workspace (among active jobs)
CREATE UNIQUE INDEX idx_jobs_workspace_slug
  ON public.jobs (workspace_id, slug)
  WHERE deleted_at IS NULL AND slug IS NOT NULL;

-- 2. Add public board settings to workspace_settings
ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS public_board_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS careers_page_title TEXT,
  ADD COLUMN IF NOT EXISTS careers_page_description TEXT;

-- 3. Create application_answers table
CREATE TABLE public.application_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.application_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Application answers: select for members"
  ON public.application_answers FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

CREATE INDEX idx_application_answers_app ON public.application_answers (application_id);
CREATE INDEX idx_application_answers_workspace ON public.application_answers (workspace_id);

-- 4. ANON RLS policies for public job board

CREATE POLICY "Jobs: public read open"
  ON public.jobs FOR SELECT TO anon
  USING (
    status = 'open'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_settings ws
      WHERE ws.workspace_id = jobs.workspace_id
      AND ws.public_board_enabled = true
    )
  );

CREATE POLICY "Workspaces: public read for board"
  ON public.workspaces FOR SELECT TO anon
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_settings ws
      WHERE ws.workspace_id = workspaces.id
      AND ws.public_board_enabled = true
    )
  );

CREATE POLICY "Workspace settings: public read board config"
  ON public.workspace_settings FOR SELECT TO anon
  USING (public_board_enabled = true);

-- 5. Function to auto-generate job slug from title
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(
      regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;

    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.jobs
        WHERE workspace_id = NEW.workspace_id
        AND slug = final_slug
        AND id IS DISTINCT FROM NEW.id
        AND deleted_at IS NULL
      );
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_job_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.generate_job_slug();

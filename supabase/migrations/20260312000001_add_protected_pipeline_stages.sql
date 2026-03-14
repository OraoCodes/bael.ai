-- =============================================================================
-- Migration: Add is_protected column to pipeline_stages
-- Protected stages (Applied, Hired, Rejected) cannot be deleted or renamed
-- =============================================================================

-- Add is_protected column
ALTER TABLE public.pipeline_stages
  ADD COLUMN is_protected BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark Applied, Hired, Rejected as protected in all existing workspaces
UPDATE public.pipeline_stages
SET is_protected = true
WHERE name IN ('Applied', 'Hired', 'Rejected');

-- Prevent deletion of protected stages
CREATE OR REPLACE FUNCTION prevent_protected_stage_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'Cannot delete protected pipeline stage: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_protected_stage_delete
  BEFORE DELETE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_protected_stage_delete();

-- Prevent updating is_protected from true to false
CREATE OR REPLACE FUNCTION prevent_unprotect_stage()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_protected = true AND NEW.is_protected = false THEN
    RAISE EXCEPTION 'Cannot unprotect a protected pipeline stage: %', OLD.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_unprotect_stage
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unprotect_stage();

-- Prevent renaming protected stages
CREATE OR REPLACE FUNCTION prevent_rename_protected_stage()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_protected = true AND NEW.name <> OLD.name THEN
    RAISE EXCEPTION 'Cannot rename a protected pipeline stage: %', OLD.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_rename_protected_stage
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_rename_protected_stage();

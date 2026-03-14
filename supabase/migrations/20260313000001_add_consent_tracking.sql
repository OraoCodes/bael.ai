-- Add consent tracking to candidate_applications for Kenya Data Protection Act compliance
ALTER TABLE public.candidate_applications
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_policy_version TEXT;

-- Add index for auditing consent records
CREATE INDEX IF NOT EXISTS idx_candidate_applications_consent
  ON public.candidate_applications (workspace_id, consent_given_at)
  WHERE consent_given_at IS NOT NULL;

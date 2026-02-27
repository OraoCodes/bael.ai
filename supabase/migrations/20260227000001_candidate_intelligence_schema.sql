-- =============================================================================
-- Migration: Candidate Intelligence — pgvector + profile columns + storage
-- =============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Add AI profile columns to candidates table (idempotent)
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS resume_text  TEXT,
  ADD COLUMN IF NOT EXISTS ai_profile   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_summary   TEXT,
  ADD COLUMN IF NOT EXISTS embedding    extensions.vector(1024),
  ADD COLUMN IF NOT EXISTS resume_path  TEXT;

-- 3. HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_candidates_embedding ON public.candidates
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. GIN index on ai_profile for structured filtering
CREATE INDEX IF NOT EXISTS idx_candidates_ai_profile ON public.candidates
  USING GIN (ai_profile jsonb_path_ops)
  WHERE deleted_at IS NULL;

-- 5. Partial index for candidates that have embeddings
CREATE INDEX IF NOT EXISTS idx_candidates_has_embedding ON public.candidates (workspace_id)
  WHERE deleted_at IS NULL AND embedding IS NOT NULL;

-- 6. Storage bucket for resumes (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLS policies (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Resumes: select for workspace members'
  ) THEN
    CREATE POLICY "Resumes: select for workspace members"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'resumes'
      AND public.is_workspace_member((storage.foldername(name))[1]::UUID)
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Resumes: insert for writers'
  ) THEN
    CREATE POLICY "Resumes: insert for writers"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'resumes'
      AND public.get_my_role((storage.foldername(name))[1]::UUID) IN ('owner', 'admin', 'recruiter')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Resumes: delete for admins'
  ) THEN
    CREATE POLICY "Resumes: delete for admins"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'resumes'
      AND public.get_my_role((storage.foldername(name))[1]::UUID) IN ('owner', 'admin')
    );
  END IF;
END $$;

-- 8. RPC function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_candidates(
  p_workspace_id UUID,
  p_embedding extensions.vector(1024),
  p_match_count INTEGER DEFAULT 50,
  p_min_similarity FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  resume_path TEXT,
  source TEXT,
  tags TEXT[],
  notes TEXT,
  ai_profile JSONB,
  ai_summary TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.linkedin_url,
    c.resume_url,
    c.resume_path,
    c.source,
    c.tags,
    c.notes,
    c.ai_profile,
    c.ai_summary,
    1 - (c.embedding <=> p_embedding) AS similarity
  FROM public.candidates c
  WHERE c.workspace_id = p_workspace_id
    AND c.deleted_at IS NULL
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> p_embedding) >= p_min_similarity
  ORDER BY c.embedding <=> p_embedding
  LIMIT p_match_count;
$$;

-- =============================================================================
-- Migration: RLS helper functions (SECURITY DEFINER)
-- =============================================================================

-- Returns all workspace IDs the current user belongs to.
-- STABLE: result is cached within a single SQL statement, avoiding N+1 RLS checks.
-- SECURITY DEFINER: bypasses RLS on workspace_memberships to prevent infinite recursion.
CREATE OR REPLACE FUNCTION public.get_my_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT workspace_id
    FROM public.workspace_memberships
    WHERE user_id = auth.uid();
$$;

-- Returns the current user's role in a specific workspace.
CREATE OR REPLACE FUNCTION public.get_my_role(p_workspace_id UUID)
RETURNS public.workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.workspace_memberships
    WHERE user_id = auth.uid()
      AND workspace_id = p_workspace_id;
$$;

-- Boolean convenience: checks if current user is a member of a workspace.
-- Use in INSERT/UPDATE WITH CHECK clauses where workspace_id is a single known value.
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_memberships
        WHERE user_id = auth.uid()
          AND workspace_id = p_workspace_id
    );
$$;

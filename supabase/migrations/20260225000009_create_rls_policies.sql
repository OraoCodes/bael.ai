-- =============================================================================
-- Migration: Enable RLS and create all policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_actions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- users (global, not workspace-scoped)
-- =============================================================================

-- Can see own profile and profiles of users in shared workspaces
CREATE POLICY "Users: select own and teammates" ON public.users
    FOR SELECT
    USING (
        auth.uid() = id
        OR id IN (
            SELECT wm.user_id
            FROM public.workspace_memberships wm
            WHERE wm.workspace_id IN (SELECT public.get_my_workspace_ids())
        )
    );

-- Users can only update their own profile
CREATE POLICY "Users: update own" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- =============================================================================
-- workspaces
-- =============================================================================

CREATE POLICY "Workspaces: select for members" ON public.workspaces
    FOR SELECT
    USING (id IN (SELECT public.get_my_workspace_ids()));

-- Any authenticated user can create a workspace
CREATE POLICY "Workspaces: insert" ON public.workspaces
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Only owners and admins can update workspace details
CREATE POLICY "Workspaces: update for owner/admin" ON public.workspaces
    FOR UPDATE
    USING (public.get_my_role(id) IN ('owner', 'admin'))
    WITH CHECK (public.get_my_role(id) IN ('owner', 'admin'));

-- =============================================================================
-- workspace_memberships
-- =============================================================================

CREATE POLICY "Memberships: select for members" ON public.workspace_memberships
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- Owners and admins can add members
CREATE POLICY "Memberships: insert for owner/admin" ON public.workspace_memberships
    FOR INSERT
    WITH CHECK (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- Owners can change any role; admins can change non-owner roles
CREATE POLICY "Memberships: update for owner/admin" ON public.workspace_memberships
    FOR UPDATE
    USING (
        public.get_my_role(workspace_id) = 'owner'
        OR (
            public.get_my_role(workspace_id) = 'admin'
            AND role != 'owner'
        )
    );

-- Users can leave; owners can remove anyone; admins can remove non-owners/non-admins
CREATE POLICY "Memberships: delete" ON public.workspace_memberships
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR public.get_my_role(workspace_id) = 'owner'
        OR (
            public.get_my_role(workspace_id) = 'admin'
            AND role NOT IN ('owner', 'admin')
        )
    );

-- =============================================================================
-- invitations
-- =============================================================================

CREATE POLICY "Invitations: select for members" ON public.invitations
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- Owners and admins can create invitations
CREATE POLICY "Invitations: insert for owner/admin" ON public.invitations
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin')
    );

-- Owners and admins can update (revoke) invitations
CREATE POLICY "Invitations: update for owner/admin" ON public.invitations
    FOR UPDATE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- =============================================================================
-- candidates (workspace-scoped standard pattern)
-- =============================================================================

CREATE POLICY "Candidates: select for members" ON public.candidates
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

CREATE POLICY "Candidates: insert" ON public.candidates
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "Candidates: update" ON public.candidates
    FOR UPDATE
    USING (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    )
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "Candidates: delete for owner/admin" ON public.candidates
    FOR DELETE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- =============================================================================
-- jobs (same pattern as candidates)
-- =============================================================================

CREATE POLICY "Jobs: select" ON public.jobs
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

CREATE POLICY "Jobs: insert" ON public.jobs
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "Jobs: update" ON public.jobs
    FOR UPDATE
    USING (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    )
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "Jobs: delete" ON public.jobs
    FOR DELETE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- =============================================================================
-- pipeline_stages
-- =============================================================================

CREATE POLICY "Pipeline stages: select" ON public.pipeline_stages
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- Only owners and admins can modify pipeline configuration
CREATE POLICY "Pipeline stages: insert" ON public.pipeline_stages
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "Pipeline stages: update" ON public.pipeline_stages
    FOR UPDATE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'))
    WITH CHECK (public.get_my_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Pipeline stages: delete" ON public.pipeline_stages
    FOR DELETE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- =============================================================================
-- candidate_applications
-- =============================================================================

CREATE POLICY "Applications: select" ON public.candidate_applications
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

CREATE POLICY "Applications: insert" ON public.candidate_applications
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "Applications: update" ON public.candidate_applications
    FOR UPDATE
    USING (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    )
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "Applications: delete" ON public.candidate_applications
    FOR DELETE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- =============================================================================
-- activities (append-only: SELECT only for authenticated users)
-- =============================================================================

CREATE POLICY "Activities: select for members" ON public.activities
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- NO insert/update/delete policies for authenticated role.
-- Only SECURITY DEFINER triggers can write to this table.

-- =============================================================================
-- workspace_settings
-- =============================================================================

CREATE POLICY "Settings: select for members" ON public.workspace_settings
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

CREATE POLICY "Settings: insert for owner/admin" ON public.workspace_settings
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin')
    );

CREATE POLICY "Settings: update for owner/admin" ON public.workspace_settings
    FOR UPDATE
    USING (public.get_my_role(workspace_id) IN ('owner', 'admin'))
    WITH CHECK (public.get_my_role(workspace_id) IN ('owner', 'admin'));

-- =============================================================================
-- scheduled_actions
-- =============================================================================

CREATE POLICY "Scheduled actions: select for members" ON public.scheduled_actions
    FOR SELECT
    USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

CREATE POLICY "Scheduled actions: insert" ON public.scheduled_actions
    FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND public.get_my_role(workspace_id) IN ('owner', 'admin', 'recruiter')
    );

CREATE POLICY "Scheduled actions: update own" ON public.scheduled_actions
    FOR UPDATE
    USING (
        workspace_id IN (SELECT public.get_my_workspace_ids())
        AND (
            created_by = auth.uid()
            OR public.get_my_role(workspace_id) IN ('owner', 'admin')
        )
    );

CREATE POLICY "Scheduled actions: delete own" ON public.scheduled_actions
    FOR DELETE
    USING (
        created_by = auth.uid()
        OR public.get_my_role(workspace_id) IN ('owner', 'admin')
    );

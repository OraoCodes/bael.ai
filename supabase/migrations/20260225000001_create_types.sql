-- =============================================================================
-- Migration: Create custom types (ENUMs)
-- =============================================================================

CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'recruiter', 'viewer');

CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TYPE public.job_status AS ENUM ('draft', 'open', 'paused', 'closed', 'archived');

CREATE TYPE public.scheduled_action_type AS ENUM (
    'reminder',
    'follow_up_email',
    'stagnation_check',
    'custom'
);

CREATE TYPE public.scheduled_action_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);

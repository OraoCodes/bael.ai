-- =============================================================================
-- Migration: Views (recruiter metrics)
-- =============================================================================

-- Recruiter performance metrics view
-- Inherits RLS from underlying tables (candidate_applications, pipeline_stages, users)
CREATE OR REPLACE VIEW public.recruiter_metrics AS
SELECT
    ca.workspace_id,
    ca.assigned_to AS recruiter_id,
    u.full_name AS recruiter_name,
    COUNT(DISTINCT ca.id) AS total_applications,
    COUNT(DISTINCT ca.id) FILTER (WHERE ps.name = 'Hired') AS total_hired,
    COUNT(DISTINCT ca.id) FILTER (WHERE ps.is_terminal = false) AS active_applications,
    AVG(EXTRACT(DAY FROM
        CASE WHEN ps.is_terminal THEN ca.updated_at ELSE now() END
        - ca.applied_at
    ))::NUMERIC(10,1) AS avg_days_to_outcome,
    COUNT(DISTINCT ca.id) FILTER (
        WHERE ps.is_terminal = false
          AND EXTRACT(DAY FROM now() - ca.stage_entered_at) > 7
    ) AS stagnant_count
FROM public.candidate_applications ca
JOIN public.pipeline_stages ps ON ps.id = ca.stage_id
JOIN public.users u ON u.id = ca.assigned_to
WHERE ca.deleted_at IS NULL
  AND ca.assigned_to IS NOT NULL
GROUP BY ca.workspace_id, ca.assigned_to, u.full_name;

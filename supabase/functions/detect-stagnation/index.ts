import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron-triggered Edge Function that detects stagnant pipeline candidates.
 * Runs daily. Creates scheduled_actions of type 'stagnation_check' for
 * candidates stuck in a non-terminal stage beyond the workspace threshold.
 */

const DEFAULT_STAGNATION_THRESHOLD_DAYS = 7;
const ALERT_COOLDOWN_DAYS = 3;

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find stagnant applications that haven't been alerted recently
    const { data: stagnantApps, error } = await supabaseAdmin.rpc(
      "detect_stagnant_applications",
      {
        default_threshold_days: DEFAULT_STAGNATION_THRESHOLD_DAYS,
        cooldown_days: ALERT_COOLDOWN_DAYS,
      }
    );

    if (error) {
      console.error("Failed to detect stagnant applications:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    if (!stagnantApps || stagnantApps.length === 0) {
      return new Response(JSON.stringify({ alerts_created: 0 }), {
        status: 200,
      });
    }

    // Create stagnation alert actions
    const alertActions = stagnantApps.map(
      (app: Record<string, unknown>) => ({
        workspace_id: app.workspace_id,
        action_type: "stagnation_check" as const,
        title: `${app.candidate_name} stuck in "${app.stage_name}" for ${app.days_in_stage} days`,
        description: `Application for ${app.job_title} has been in the "${app.stage_name}" stage since ${app.stage_entered_at}`,
        due_at: new Date().toISOString(), // Due immediately
        entity_type: "candidate_applications",
        entity_id: app.application_id,
        assigned_to: app.assigned_to,
        created_by: app.assigned_to, // Attribute to assigned recruiter
        payload: {
          candidate_id: app.candidate_id,
          job_id: app.job_id,
          days_in_stage: app.days_in_stage,
          stage_name: app.stage_name,
        },
      })
    );

    const { error: insertError } = await supabaseAdmin
      .from("scheduled_actions")
      .insert(alertActions);

    if (insertError) {
      console.error("Failed to create stagnation alerts:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({ alerts_created: alertActions.length }),
      { status: 200 }
    );
  } catch (error) {
    console.error("detect-stagnation error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});

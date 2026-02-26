import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron-triggered Edge Function that processes pending scheduled actions.
 * Runs every 15 minutes via Supabase cron.
 *
 * Handles: reminders, follow_up_email, stagnation_check, custom actions.
 * Uses FOR UPDATE SKIP LOCKED to prevent duplicate processing.
 */

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending actions that are due, with row-level locking
    const { data: actions, error: fetchError } = await supabaseAdmin.rpc(
      "fetch_due_scheduled_actions",
      { batch_size: 50 }
    );

    if (fetchError) {
      console.error("Failed to fetch scheduled actions:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
      });
    }

    if (!actions || actions.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    let processed = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from("scheduled_actions")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", action.id);

        // Process based on action type
        switch (action.action_type) {
          case "follow_up_email":
            await processFollowUpEmail(supabaseAdmin, action);
            break;
          case "reminder":
            // Reminders are surfaced client-side; mark as completed
            break;
          case "stagnation_check":
            // Stagnation alerts are surfaced client-side; mark as completed
            break;
          case "custom":
            // Custom actions: execute payload-defined logic
            break;
        }

        // Mark as completed
        await supabaseAdmin
          .from("scheduled_actions")
          .update({
            status: "completed",
            executed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", action.id);

        // Log activity
        await supabaseAdmin.from("activities").insert({
          workspace_id: action.workspace_id,
          actor_id: null, // System action
          entity_type: "scheduled_actions",
          entity_id: action.id,
          action: "executed",
          metadata: {
            action_type: action.action_type,
            title: action.title,
          },
        });

        processed++;
      } catch (err) {
        console.error(`Failed to process action ${action.id}:`, err);
        await supabaseAdmin
          .from("scheduled_actions")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : String(err),
            updated_at: new Date().toISOString(),
          })
          .eq("id", action.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, total: actions.length }),
      { status: 200 }
    );
  } catch (error) {
    console.error("process-scheduled-actions error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});

async function processFollowUpEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  action: Record<string, unknown>
) {
  const payload = action.payload as Record<string, unknown>;

  // Load candidate data if entity_type is 'candidates'
  if (action.entity_type === "candidates" && action.entity_id) {
    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("first_name, last_name, email")
      .eq("id", action.entity_id)
      .single();

    if (!candidate?.email) {
      throw new Error("Candidate has no email address");
    }

    // TODO: Integrate with email provider (Resend, SendGrid)
    // await sendEmail({
    //   to: candidate.email,
    //   subject: payload.subject as string,
    //   body: payload.body as string,
    // });

    console.log(
      `[follow_up_email] Would send to ${candidate.email}: ${payload?.subject || action.title}`
    );
  }
}

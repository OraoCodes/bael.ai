import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, buildInviteEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization")!;
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type } = body;

    switch (type) {
      case "invitation": {
        const { invitation_id } = body;
        if (!invitation_id) {
          return new Response(
            JSON.stringify({ error: "invitation_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Fetch invitation with workspace and inviter details
        const { data: invitation, error: invErr } = await supabaseAdmin
          .from("invitations")
          .select(
            "id, email, role, token, expires_at, workspace_id, invited_by"
          )
          .eq("id", invitation_id)
          .eq("status", "pending")
          .single();

        if (invErr || !invitation) {
          return new Response(
            JSON.stringify({ error: "Invitation not found" }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Verify caller has permission (must be owner/admin of the workspace)
        const { data: membership } = await supabaseAdmin
          .from("workspace_memberships")
          .select("role")
          .eq("workspace_id", invitation.workspace_id)
          .eq("user_id", user.id)
          .single();

        if (
          !membership ||
          !["owner", "admin"].includes(membership.role)
        ) {
          return new Response(
            JSON.stringify({ error: "Insufficient permissions" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Fetch workspace name and inviter name
        const [{ data: workspace }, { data: inviter }] = await Promise.all([
          supabaseAdmin
            .from("workspaces")
            .select("name")
            .eq("id", invitation.workspace_id)
            .single(),
          supabaseAdmin
            .from("users")
            .select("full_name, email")
            .eq("id", invitation.invited_by)
            .single(),
        ]);

        const inviterName =
          inviter?.full_name || inviter?.email || "A team member";
        const workspaceName = workspace?.name || "a workspace";

        const { subject, html } = buildInviteEmail({
          inviterName,
          workspaceName,
          role: invitation.role,
          token: invitation.token,
          expiresAt: invitation.expires_at,
        });

        await sendEmail({ to: invitation.email, subject, html });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

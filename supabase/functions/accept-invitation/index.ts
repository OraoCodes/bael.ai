import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  token: string;
}

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

    const body: AcceptInvitationRequest = await req.json();

    if (!body.token) {
      return new Response(
        JSON.stringify({ error: "token is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Find the pending invitation (using service_role to bypass RLS)
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("token", body.token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Verify the invitation email matches the authenticated user
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({
          error: "This invitation was sent to a different email address",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Check if already a member
    const { data: existingMembership } = await supabaseAdmin
      .from("workspace_memberships")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (existingMembership) {
      // Already a member — just mark invitation accepted
      await supabaseAdmin
        .from("invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ message: "Already a member of this workspace" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Create workspace membership
    const { error: memberError } = await supabaseAdmin
      .from("workspace_memberships")
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) throw memberError;

    // 5. Log "member_joined" activity
    await supabaseAdmin.from("activities").insert({
      workspace_id: invitation.workspace_id,
      actor_id: user.id,
      entity_type: "workspace_memberships",
      entity_id: invitation.workspace_id,
      action: "member_joined",
      metadata: {
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        role: invitation.role,
        invitation_id: invitation.id,
      },
    });

    // 6. Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        message: "Invitation accepted",
        workspace_id: invitation.workspace_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("accept-invitation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

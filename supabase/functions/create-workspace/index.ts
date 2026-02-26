import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateWorkspaceRequest {
  name: string;
  slug: string;
  // Onboarding wizard fields
  company_size?: string;
  industry?: string;
  hiring_volume?: string;
  timezone?: string;
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

    // Get the user from the auth header
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

    const body: CreateWorkspaceRequest = await req.json();

    if (!body.name || !body.slug) {
      return new Response(
        JSON.stringify({ error: "name and slug are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate slug format (lowercase alphanumeric + hyphens)
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(body.slug)) {
      return new Response(
        JSON.stringify({
          error:
            "slug must be 3-50 chars, lowercase alphanumeric and hyphens only",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // All operations use service_role to bypass RLS (atomic workspace creation)
    // 1. Create workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .insert({ name: body.name, slug: body.slug, created_by: user.id })
      .select()
      .single();

    if (wsError) {
      if (wsError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "A workspace with this slug already exists" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw wsError;
    }

    // 2. Create owner membership
    const { error: memberError } = await supabaseAdmin
      .from("workspace_memberships")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) throw memberError;

    // 3. Create default pipeline stages
    const defaultStages = [
      { name: "Applied", position: 1, is_terminal: false },
      { name: "Phone Screen", position: 2, is_terminal: false },
      { name: "Interview", position: 3, is_terminal: false },
      { name: "Offer", position: 4, is_terminal: false },
      { name: "Hired", position: 5, is_terminal: true },
      { name: "Rejected", position: 6, is_terminal: true },
    ];

    const { error: stagesError } = await supabaseAdmin
      .from("pipeline_stages")
      .insert(
        defaultStages.map((stage) => ({
          workspace_id: workspace.id,
          ...stage,
        }))
      );

    if (stagesError) throw stagesError;

    // 4. Create workspace settings
    const { error: settingsError } = await supabaseAdmin
      .from("workspace_settings")
      .insert({
        workspace_id: workspace.id,
        company_size: body.company_size || null,
        industry: body.industry || null,
        hiring_volume: body.hiring_volume || null,
        timezone: body.timezone || "UTC",
        onboarding_completed: true,
      });

    if (settingsError) throw settingsError;

    return new Response(JSON.stringify({ workspace }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-workspace error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

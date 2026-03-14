import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Inlined email helpers (MCP bundler can't resolve _shared/ imports) ───
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Bael <noreply@notifications.archeotalent.com>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return res.json();
}

function buildWelcomeEmail(params: { userName: string; workspaceName: string; workspaceSlug: string }) {
  const dashboardUrl = `${SITE_URL}/w/${params.workspaceSlug}`;
  const firstName = params.userName.split(" ")[0] || "there";
  const subject = `Welcome to Bael — ${params.workspaceName} is ready!`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><tr><td style="padding:40px 36px 0;text-align:center"><div style="font-size:40px;margin-bottom:12px">🎉</div><h1 style="margin:0 0 8px;font-size:24px;color:#18181b;font-weight:700">Welcome aboard, ${firstName}!</h1><p style="margin:0;color:#71717a;font-size:15px;line-height:1.6">Your workspace <strong style="color:#18181b">${params.workspaceName}</strong> is all set up and ready to go.</p></td></tr><tr><td style="padding:28px 36px 0"><p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#18181b">Here's how to get started:</p><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:10px 0;vertical-align:top;width:32px"><div style="width:24px;height:24px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:13px;font-weight:700;line-height:24px;text-align:center">1</div></td><td style="padding:10px 0 10px 12px"><p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">Post your first job</strong> — Create an open role and it'll appear on your public careers page.</p></td></tr><tr><td style="padding:10px 0;vertical-align:top;width:32px"><div style="width:24px;height:24px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:13px;font-weight:700;line-height:24px;text-align:center">2</div></td><td style="padding:10px 0 10px 12px"><p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">Connect your inbox</strong> — Link Gmail so CVs are automatically parsed and added to your pipeline.</p></td></tr><tr><td style="padding:10px 0;vertical-align:top;width:32px"><div style="width:24px;height:24px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:13px;font-weight:700;line-height:24px;text-align:center">3</div></td><td style="padding:10px 0 10px 12px"><p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">Invite your team</strong> — Add recruiters and hiring managers to collaborate on candidates.</p></td></tr></table></td></tr><tr><td style="padding:28px 36px;text-align:center"><a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:12px 36px;border-radius:8px;text-decoration:none">Go to your workspace →</a></td></tr><tr><td style="padding:0 36px"><div style="border-top:1px solid #e4e4e7"></div></td></tr><tr><td style="padding:20px 36px 32px;text-align:center"><p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5">Need help? Just reply to this email — we'd love to hear from you.</p></td></tr></table><p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Bael — Recruitment CRM</p></td></tr></table></body></html>`;
  return { subject, html };
}

// ─── Main handler ───

interface CreateWorkspaceRequest {
  name: string;
  slug: string;
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
      { name: "Applied", position: 1, is_terminal: false, is_protected: true },
      { name: "Phone Screen", position: 2, is_terminal: false, is_protected: false },
      { name: "Interview", position: 3, is_terminal: false, is_protected: false },
      { name: "Offer", position: 4, is_terminal: false, is_protected: false },
      { name: "Hired", position: 5, is_terminal: true, is_protected: true },
      { name: "Rejected", position: 6, is_terminal: true, is_protected: true },
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
        public_board_enabled: true,
      });

    if (settingsError) throw settingsError;

    // 5. Create 30-day trial subscription
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: subError } = await supabaseAdmin
      .from("workspace_subscriptions")
      .insert({
        workspace_id: workspace.id,
        plan_id: "starter",
        stripe_customer_id: "",
        status: "trialing",
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt,
      });

    if (subError) {
      console.error("Subscription creation failed (non-fatal):", subError);
    }

    // 5b. Cancel onboarding nudges
    try {
      await supabaseAdmin.rpc("cancel_onboarding_nudges", {
        p_user_id: user.id,
      });
    } catch (nudgeErr) {
      console.error("Cancel nudges failed (non-fatal):", nudgeErr);
    }

    // 6. Send welcome email (non-blocking)
    try {
      const userName = user.user_metadata?.full_name || user.email || "there";
      const { subject, html } = buildWelcomeEmail({
        userName,
        workspaceName: body.name,
        workspaceSlug: body.slug,
      });
      await sendEmail({ to: user.email!, subject, html });
    } catch (emailErr) {
      console.error("Welcome email failed (non-fatal):", emailErr);
    }

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

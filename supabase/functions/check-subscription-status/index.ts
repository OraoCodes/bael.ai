import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://bael.ai";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Bael <noreply@notifications.archeotalent.com>", to, subject, html }),
    });
    if (!res.ok) console.error("Email send failed:", await res.text());
  } catch (e) {
    console.error("Email error:", e);
  }
}

function trialExpiryEmail(firstName: string, workspaceName: string, slug: string, daysLeft: number) {
  const billingUrl = `${SITE_URL}/w/${slug}/settings?tab=billing`;
  const urgent = daysLeft <= 3;
  return {
    subject: urgent
      ? `⚠️ Your bael.ai trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
      : `Your bael.ai trial ends in ${daysLeft} days`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)"><tr><td style="padding:40px 36px 0;text-align:center"><div style="font-size:40px;margin-bottom:12px">${urgent ? "⏰" : "📅"}</div><h1 style="margin:0 0 8px;font-size:22px;color:#18181b;font-weight:700">Your trial ${daysLeft === 0 ? "ends today" : `ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}</h1><p style="margin:0;color:#71717a;font-size:15px;line-height:1.6">Hi ${firstName}, your free trial for <strong style="color:#18181b">${workspaceName}</strong> is almost up.</p></td></tr><tr><td style="padding:28px 36px;text-align:center"><p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.6">Subscribe now to keep access to all your candidates, jobs, and pipeline data. Your data is safe — it won't be deleted.</p><a href="${billingUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:15px;font-weight:600;padding:12px 36px;border-radius:8px;text-decoration:none">Subscribe now →</a></td></tr><tr><td style="padding:0 36px 32px;text-align:center"><p style="margin:0;color:#a1a1aa;font-size:13px">After your trial, plans start at $49/month.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

function trialExpiredEmail(firstName: string, workspaceName: string, slug: string, graceDaysLeft: number) {
  const billingUrl = `${SITE_URL}/w/${slug}/settings?tab=billing`;
  return {
    subject: `Your bael.ai trial has ended — ${graceDaysLeft} days to reactivate`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)"><tr><td style="padding:40px 36px 0;text-align:center"><div style="font-size:40px;margin-bottom:12px">🔒</div><h1 style="margin:0 0 8px;font-size:22px;color:#18181b;font-weight:700">Your trial has ended</h1><p style="margin:0;color:#71717a;font-size:15px;line-height:1.6">Hi ${firstName}, your free trial for <strong style="color:#18181b">${workspaceName}</strong> has ended. Your workspace is now in read-only mode.</p></td></tr><tr><td style="padding:28px 36px;text-align:center"><p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6"><strong style="color:#dc2626">You have ${graceDaysLeft} days</strong> before your workspace becomes fully locked. All your data is safe.</p><p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.6">Subscribe now to continue where you left off.</p><a href="${billingUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:15px;font-weight:600;padding:12px 36px;border-radius:8px;text-decoration:none">Reactivate workspace →</a></td></tr><tr><td style="padding:0 36px 32px;text-align:center"><p style="margin:0;color:#a1a1aa;font-size:13px">Plans start at $49/month. Cancel anytime.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

serve(async (_req) => {
  const now = new Date();

  // 1. Expire trials that have ended — set to 'expired' with 7-day grace
  const { data: expiredTrials } = await supabaseAdmin
    .from("workspace_subscriptions")
    .select("id, workspace_id, trial_ends_at")
    .eq("status", "trialing")
    .lt("trial_ends_at", now.toISOString());

  for (const sub of expiredTrials ?? []) {
    const gracePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await supabaseAdmin
      .from("workspace_subscriptions")
      .update({
        status: "expired",
        grace_period_ends_at: gracePeriodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", sub.id);

    await supabaseAdmin.from("billing_events").insert({
      workspace_id: sub.workspace_id,
      event_type: "trial_expired",
      metadata: { grace_period_ends_at: gracePeriodEnd.toISOString() },
    });

    // Send email to workspace owner
    const { data: owner } = await supabaseAdmin
      .from("workspace_memberships")
      .select("user_id, workspaces(name, slug)")
      .eq("workspace_id", sub.workspace_id)
      .eq("role", "owner")
      .single() as { data: { user_id: string; workspaces: { name: string; slug: string } } | null };

    if (owner) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(owner.user_id);
      const email = authUser.user?.email;
      const firstName = (authUser.user?.user_metadata?.full_name || "there").split(" ")[0];
      if (email) {
        const { subject, html } = trialExpiredEmail(firstName, owner.workspaces.name, owner.workspaces.slug, 7);
        await sendEmail({ to: email, subject, html });
      }
    }
  }

  // 2. Lock workspaces past their grace period
  const { data: gracedOut } = await supabaseAdmin
    .from("workspace_subscriptions")
    .select("id, workspace_id")
    .in("status", ["expired", "canceled"])
    .not("grace_period_ends_at", "is", null)
    .lt("grace_period_ends_at", now.toISOString());

  for (const sub of gracedOut ?? []) {
    await supabaseAdmin
      .from("workspace_subscriptions")
      .update({ status: "expired", grace_period_ends_at: null, updated_at: now.toISOString() })
      .eq("id", sub.id);

    await supabaseAdmin.from("billing_events").insert({
      workspace_id: sub.workspace_id,
      event_type: "grace_period_ended",
      metadata: {},
    });
  }

  // 3. Send trial reminder emails (7 days before expiry, 3 days before, 1 day before)
  const reminderDays = [7, 3, 1];
  for (const days of reminderDays) {
    const windowStart = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000); // 1hr window

    const { data: upcoming } = await supabaseAdmin
      .from("workspace_subscriptions")
      .select("workspace_id, trial_ends_at")
      .eq("status", "trialing")
      .gte("trial_ends_at", windowStart.toISOString())
      .lt("trial_ends_at", windowEnd.toISOString());

    for (const sub of upcoming ?? []) {
      // Check if we've already sent this reminder
      const { data: alreadySent } = await supabaseAdmin
        .from("billing_events")
        .select("id")
        .eq("workspace_id", sub.workspace_id)
        .eq("event_type", `trial_reminder_${days}d`)
        .single();

      if (alreadySent) continue;

      const { data: owner } = await supabaseAdmin
        .from("workspace_memberships")
        .select("user_id, workspaces(name, slug)")
        .eq("workspace_id", sub.workspace_id)
        .eq("role", "owner")
        .single() as { data: { user_id: string; workspaces: { name: string; slug: string } } | null };

      if (owner) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(owner.user_id);
        const email = authUser.user?.email;
        const firstName = (authUser.user?.user_metadata?.full_name || "there").split(" ")[0];
        if (email) {
          const { subject, html } = trialExpiryEmail(firstName, owner.workspaces.name, owner.workspaces.slug, days);
          await sendEmail({ to: email, subject, html });
        }
      }

      await supabaseAdmin.from("billing_events").insert({
        workspace_id: sub.workspace_id,
        event_type: `trial_reminder_${days}d`,
        metadata: { days_remaining: days },
      });
    }
  }

  return new Response(JSON.stringify({
    expired_trials: expiredTrials?.length ?? 0,
    graced_out: gracedOut?.length ?? 0,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

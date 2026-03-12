import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron-triggered Edge Function that sends:
 * 1. Onboarding nudges — for users who signed up but haven't created a workspace
 * 2. Invitation nudges — for invitees who haven't accepted yet
 *
 * Schedule: every 15 minutes.
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
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

// ─── Onboarding Nudge Email Template ─────────────────────────────────────────

function buildOnboardingNudgeEmail(params: {
  userName: string;
  step: "1h" | "24h" | "72h";
}) {
  const createUrl = `${SITE_URL}/onboarding`;
  const firstName = params.userName.split(" ")[0] || "there";

  const variants = {
    "1h": {
      subject: "You're still the human in Human Resources",
      emoji: "\u{1F44B}",
      headline: `Hey ${firstName}, you're almost there`,
      body: `You signed up \u2014 that's the hard part. But right now, resumes are still piling up in your inbox, candidates are slipping through the cracks, and your hiring pipeline lives in a spreadsheet.`,
      features: [
        { icon: "\u{1F4C4}", title: "AI-powered resume parsing", desc: "Drop a CV, get a structured candidate profile in seconds." },
        { icon: "\u{1F3AF}", title: "Smart candidate matching", desc: "AI scores candidates against your job requirements automatically." },
        { icon: "\u{1F4CB}", title: "Visual hiring pipeline", desc: "Drag-and-drop Kanban board. Know where every candidate stands." },
      ],
      cta: "Create your workspace",
      ctaNote: "It takes less than 2 minutes.",
    },
    "24h": {
      subject: `${firstName}, your candidates are waiting`,
      emoji: "\u23F0",
      headline: `24 hours ago, you took the first step`,
      body: `Since you signed up, the average recruiter has spent 3 hours manually screening resumes. You could have had AI do that in minutes. Your workspace is one click away from changing how you hire.`,
      features: [
        { icon: "\u{1F4EC}", title: "Email-to-pipeline", desc: "Connect Gmail and incoming CVs become candidates automatically." },
        { icon: "\u{1F465}", title: "Team collaboration", desc: "Invite hiring managers. Everyone sees the same pipeline, in real-time." },
        { icon: "\u{1F514}", title: "Never lose track", desc: "Automated reminders and stagnation alerts keep your process moving." },
      ],
      cta: "Set up your workspace now",
      ctaNote: "Your first 3 job postings are on us.",
    },
    "72h": {
      subject: `Last call, ${firstName} \u2014 we saved your spot`,
      emoji: "\u{1F680}",
      headline: `We're not giving up on you`,
      body: `Look, we get it \u2014 another tool, another onboarding. But Bael isn't another ATS you'll fight with. It's the one that actually works with you. One workspace. Two minutes. And you'll wonder why you waited.`,
      features: [
        { icon: "\u26A1", title: "2-minute setup", desc: "Name your workspace, and you're in. Default pipeline stages are ready." },
        { icon: "\u{1F916}", title: "AI that actually helps", desc: "Resume parsing, job matching, candidate scoring \u2014 all built in." },
        { icon: "\u{1F30D}", title: "Public careers page", desc: "Post a job and get a shareable careers page instantly." },
      ],
      cta: "Create your workspace \u2014 last chance",
      ctaNote: "After this, we'll stop bugging you. Promise.",
    },
  };

  const v = variants[params.step];
  return { subject: v.subject, html: buildFeatureEmail(v, createUrl, `You're receiving this because you signed up for Bael but haven't created a workspace yet.`) };
}

// ─── Invitation Nudge Email Template ─────────────────────────────────────────

function buildInvitationNudgeEmail(params: {
  inviteeEmail: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  token: string;
  step: "4h" | "48h" | "5d";
  expiresAt: string;
}) {
  const acceptUrl = `${SITE_URL}/invite/${params.token}`;
  const inviterFirst = params.inviterName.split(" ")[0] || "Your teammate";
  const daysLeft = Math.max(0, Math.ceil((new Date(params.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const variants = {
    "4h": {
      subject: `${params.workspaceName} needs you \u2014 ${inviterFirst} is waiting`,
      emoji: "\u{1F64B}",
      headline: `${inviterFirst} saved you a seat`,
      body: `You've been invited to join <strong style="color:#18181b">${params.workspaceName}</strong> as a <strong style="color:#18181b">${params.role}</strong>. The team is already setting things up \u2014 they just need you to jump in.`,
      features: [
        { icon: "\u{1F4BC}", title: "Your role is ready", desc: `You'll join as ${params.role} with full access to the hiring pipeline.` },
        { icon: "\u{1F91D}", title: "Collaborate in real-time", desc: "Review candidates, leave notes, and move people through stages together." },
        { icon: "\u26A1", title: "One click to join", desc: "No setup required \u2014 the workspace is already configured for you." },
      ],
      cta: "Accept invitation",
      ctaNote: "Takes about 10 seconds. Seriously.",
    },
    "48h": {
      subject: `${inviterFirst} is still waiting for you at ${params.workspaceName}`,
      emoji: "\u{1F440}",
      headline: `Don't leave ${inviterFirst} hanging`,
      body: `Two days ago, ${inviterFirst} invited you to join <strong style="color:#18181b">${params.workspaceName}</strong>. The team is actively reviewing candidates and moving people through the pipeline \u2014 your input matters.`,
      features: [
        { icon: "\u{1F4CA}", title: "Candidates are flowing in", desc: "Resumes are being parsed and scored \u2014 they need your eyes on them." },
        { icon: "\u{1F4AC}", title: "Your opinion counts", desc: "Leave feedback, rate candidates, and help make better hiring decisions." },
        { icon: "\u{23F3}", title: `${daysLeft} days left`, desc: "This invitation expires soon. Don't miss your window." },
      ],
      cta: "Join the team now",
      ctaNote: `Your invitation expires in ${daysLeft} days.`,
    },
    "5d": {
      subject: `Final reminder: your invite to ${params.workspaceName} expires soon`,
      emoji: "\u{1F6A8}",
      headline: `This is your last chance`,
      body: `${inviterFirst} invited you to <strong style="color:#18181b">${params.workspaceName}</strong> ${Math.ceil((Date.now() - new Date(params.expiresAt).getTime() + daysLeft * 86400000) / 86400000)} days ago. The invitation expires in <strong style="color:#dc2626">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>. After that, they'll need to re-invite you.`,
      features: [
        { icon: "\u{1F3C3}", title: "Still time \u2014 barely", desc: "Click below and you're in. The workspace is ready and waiting." },
        { icon: "\u{1F465}", title: "The team misses you", desc: `${inviterFirst} specifically chose you to be part of this hiring team.` },
        { icon: "\u{274C}", title: "After this, it's gone", desc: "We won't send another reminder. This is it." },
      ],
      cta: "Accept before it expires",
      ctaNote: "Last reminder. We promise.",
    },
  };

  const v = variants[params.step];
  return { subject: v.subject, html: buildFeatureEmail(v, acceptUrl, `You're receiving this because ${inviterFirst} invited you to join ${params.workspaceName} on Bael.`) };
}

// ─── Shared HTML builder ─────────────────────────────────────────────────────

function buildFeatureEmail(
  v: { emoji: string; headline: string; body: string; features: { icon: string; title: string; desc: string }[]; cta: string; ctaNote: string },
  ctaUrl: string,
  footerText: string,
) {
  const featuresHtml = v.features
    .map(
      (f) => `
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:32px">
            <div style="font-size:20px;line-height:24px">${f.icon}</div>
          </td>
          <td style="padding:8px 0 8px 12px">
            <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">${f.title}</strong> \u2014 ${f.desc}</p>
          </td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="padding:40px 36px 0;text-align:center">
          <div style="font-size:40px;margin-bottom:12px">${v.emoji}</div>
          <h1 style="margin:0 0 12px;font-size:22px;color:#18181b;font-weight:700">${v.headline}</h1>
          <p style="margin:0;color:#71717a;font-size:15px;line-height:1.6">${v.body}</p>
        </td></tr>
        <tr><td style="padding:24px 36px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${featuresHtml}
          </table>
        </td></tr>
        <tr><td style="padding:28px 36px;text-align:center">
          <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:12px 36px;border-radius:8px;text-decoration:none">${v.cta} \u2192</a>
          <p style="margin:12px 0 0;color:#a1a1aa;font-size:13px">${v.ctaNote}</p>
        </td></tr>
        <tr><td style="padding:0 36px"><div style="border-top:1px solid #e4e4e7"></div></td></tr>
        <tr><td style="padding:20px 36px 32px;text-align:center">
          <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5">
            ${footerText}<br>
            <a href="${SITE_URL}/unsubscribe" style="color:#a1a1aa;text-decoration:underline">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Bael \u2014 Recruitment CRM</p>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results = { onboarding: { sent: 0, skipped: 0, failed: 0 }, invitation: { sent: 0, skipped: 0, failed: 0 } };

    // ═══ PART 1: Onboarding nudges (workspace-less users) ═══════════════════

    const { data: onboardingNudges } = await supabaseAdmin
      .from("onboarding_nudges")
      .select("id, user_id, step")
      .eq("status", "pending")
      .lte("send_at", new Date().toISOString())
      .order("send_at", { ascending: true })
      .limit(50);

    for (const nudge of onboardingNudges || []) {
      try {
        const { count } = await supabaseAdmin
          .from("workspace_memberships")
          .select("id", { count: "exact", head: true })
          .eq("user_id", nudge.user_id);

        if (count && count > 0) {
          await supabaseAdmin.rpc("cancel_onboarding_nudges", { p_user_id: nudge.user_id });
          results.onboarding.skipped++;
          continue;
        }

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("email, full_name")
          .eq("id", nudge.user_id)
          .single();

        if (user?.email) {
          const { count: inviteCount } = await supabaseAdmin
            .from("invitations")
            .select("id", { count: "exact", head: true })
            .eq("email", user.email);

          if (inviteCount && inviteCount > 0) {
            await supabaseAdmin.rpc("cancel_onboarding_nudges", { p_user_id: nudge.user_id });
            results.onboarding.skipped++;
            continue;
          }
        }

        if (!user?.email) {
          results.onboarding.skipped++;
          continue;
        }

        const { subject, html } = buildOnboardingNudgeEmail({
          userName: user.full_name || user.email,
          step: nudge.step,
        });

        await sendEmail({ to: user.email, subject, html });
        await supabaseAdmin
          .from("onboarding_nudges")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", nudge.id);

        console.log(`[onboarding_nudge] Sent ${nudge.step} to ${user.email}`);
        results.onboarding.sent++;
      } catch (err) {
        console.error(`Failed onboarding nudge ${nudge.id}:`, err);
        results.onboarding.failed++;
      }
    }

    // ═══ PART 2: Invitation nudges (pending invitees) ═══════════════════════

    const { data: inviteNudges } = await supabaseAdmin
      .from("invitation_nudges")
      .select("id, invitation_id, step")
      .eq("status", "pending")
      .lte("send_at", new Date().toISOString())
      .order("send_at", { ascending: true })
      .limit(50);

    for (const nudge of inviteNudges || []) {
      try {
        // Fetch invitation with workspace + inviter details
        const { data: invite } = await supabaseAdmin
          .from("invitations")
          .select("id, email, role, status, token, expires_at, workspace_id")
          .eq("id", nudge.invitation_id)
          .single();

        if (!invite || invite.status !== "pending") {
          // Invitation was accepted/revoked/expired — cancel remaining nudges
          await supabaseAdmin
            .from("invitation_nudges")
            .update({ status: "cancelled" })
            .eq("invitation_id", nudge.invitation_id)
            .eq("status", "pending");
          results.invitation.skipped++;
          continue;
        }

        // Check if invitation has expired
        if (new Date(invite.expires_at) < new Date()) {
          await supabaseAdmin
            .from("invitation_nudges")
            .update({ status: "cancelled" })
            .eq("invitation_id", nudge.invitation_id)
            .eq("status", "pending");
          results.invitation.skipped++;
          continue;
        }

        // Get workspace name
        const { data: workspace } = await supabaseAdmin
          .from("workspaces")
          .select("name")
          .eq("id", invite.workspace_id)
          .single();

        // Get inviter name
        const { data: inviterMembership } = await supabaseAdmin
          .from("invitations")
          .select("invited_by")
          .eq("id", invite.id)
          .single();

        const { data: inviter } = await supabaseAdmin
          .from("users")
          .select("full_name")
          .eq("id", inviterMembership?.invited_by)
          .single();

        const { subject, html } = buildInvitationNudgeEmail({
          inviteeEmail: invite.email,
          inviterName: inviter?.full_name || "Your teammate",
          workspaceName: workspace?.name || "the team",
          role: invite.role,
          token: invite.token,
          step: nudge.step,
          expiresAt: invite.expires_at,
        });

        await sendEmail({ to: invite.email, subject, html });
        await supabaseAdmin
          .from("invitation_nudges")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", nudge.id);

        console.log(`[invitation_nudge] Sent ${nudge.step} to ${invite.email}`);
        results.invitation.sent++;
      } catch (err) {
        console.error(`Failed invitation nudge ${nudge.id}:`, err);
        results.invitation.failed++;
      }
    }

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error) {
    console.error("process-onboarding-nudges error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});

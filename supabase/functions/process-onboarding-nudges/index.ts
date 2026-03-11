import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron-triggered Edge Function that sends onboarding nudge emails
 * to users who signed up but haven't created a workspace yet.
 *
 * Schedule: every 15 minutes (same as process-scheduled-actions).
 * Nudge series: 1 hour, 24 hours, 72 hours after sign-up.
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

function buildOnboardingNudgeEmail(params: {
  userName: string;
  step: "1h" | "24h" | "72h";
}) {
  const createUrl = `${SITE_URL}/onboarding`;
  const firstName = params.userName.split(" ")[0] || "there";

  const variants = {
    "1h": {
      subject: "You're still the human in Human Resources",
      emoji: "👋",
      headline: `Hey ${firstName}, you're almost there`,
      body: `You signed up — that's the hard part. But right now, resumes are still piling up in your inbox, candidates are slipping through the cracks, and your hiring pipeline lives in a spreadsheet.`,
      features: [
        {
          icon: "📄",
          title: "AI-powered resume parsing",
          desc: "Drop a CV, get a structured candidate profile in seconds.",
        },
        {
          icon: "🎯",
          title: "Smart candidate matching",
          desc: "AI scores candidates against your job requirements automatically.",
        },
        {
          icon: "📋",
          title: "Visual hiring pipeline",
          desc: "Drag-and-drop Kanban board. Know where every candidate stands.",
        },
      ],
      cta: "Create your workspace",
      ctaNote: "It takes less than 2 minutes.",
    },
    "24h": {
      subject: `${firstName}, your candidates are waiting`,
      emoji: "⏰",
      headline: `24 hours ago, you took the first step`,
      body: `Since you signed up, the average recruiter has spent 3 hours manually screening resumes. You could have had AI do that in minutes. Your workspace is one click away from changing how you hire.`,
      features: [
        {
          icon: "📬",
          title: "Email-to-pipeline",
          desc: "Connect Gmail and incoming CVs become candidates automatically.",
        },
        {
          icon: "👥",
          title: "Team collaboration",
          desc: "Invite hiring managers. Everyone sees the same pipeline, in real-time.",
        },
        {
          icon: "🔔",
          title: "Never lose track",
          desc: "Automated reminders and stagnation alerts keep your process moving.",
        },
      ],
      cta: "Set up your workspace now",
      ctaNote: "Your first 3 job postings are on us.",
    },
    "72h": {
      subject: `Last call, ${firstName} — we saved your spot`,
      emoji: "🚀",
      headline: `We're not giving up on you`,
      body: `Look, we get it — another tool, another onboarding. But Bael isn't another ATS you'll fight with. It's the one that actually works with you. One workspace. Two minutes. And you'll wonder why you waited.`,
      features: [
        {
          icon: "⚡",
          title: "2-minute setup",
          desc: "Name your workspace, and you're in. Default pipeline stages are ready.",
        },
        {
          icon: "🤖",
          title: "AI that actually helps",
          desc: "Resume parsing, job matching, candidate scoring — all built in.",
        },
        {
          icon: "🌍",
          title: "Public careers page",
          desc: "Post a job and get a shareable careers page instantly.",
        },
      ],
      cta: "Create your workspace — last chance",
      ctaNote: "After this, we'll stop bugging you. Promise.",
    },
  };

  const v = variants[params.step];

  const featuresHtml = v.features
    .map(
      (f) => `
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:32px">
            <div style="font-size:20px;line-height:24px">${f.icon}</div>
          </td>
          <td style="padding:8px 0 8px 12px">
            <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">${f.title}</strong> — ${f.desc}</p>
          </td>
        </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr><td style="padding:40px 36px 0;text-align:center">
          <div style="font-size:40px;margin-bottom:12px">${v.emoji}</div>
          <h1 style="margin:0 0 12px;font-size:22px;color:#18181b;font-weight:700">${v.headline}</h1>
          <p style="margin:0;color:#71717a;font-size:15px;line-height:1.6">${v.body}</p>
        </td></tr>
        <!-- Features -->
        <tr><td style="padding:24px 36px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${featuresHtml}
          </table>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:28px 36px;text-align:center">
          <a href="${createUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:12px 36px;border-radius:8px;text-decoration:none">${v.cta} →</a>
          <p style="margin:12px 0 0;color:#a1a1aa;font-size:13px">${v.ctaNote}</p>
        </td></tr>
        <!-- Divider -->
        <tr><td style="padding:0 36px">
          <div style="border-top:1px solid #e4e4e7"></div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 36px 32px;text-align:center">
          <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5">
            You're receiving this because you signed up for Bael but haven't created a workspace yet.<br>
            <a href="${SITE_URL}/unsubscribe" style="color:#a1a1aa;text-decoration:underline">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Bael — Recruitment CRM</p>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { subject: v.subject, html };
}

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending nudges that are due
    const { data: nudges, error: fetchError } = await supabaseAdmin
      .from("onboarding_nudges")
      .select("id, user_id, step")
      .eq("status", "pending")
      .lte("send_at", new Date().toISOString())
      .order("send_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Failed to fetch nudges:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
      });
    }

    if (!nudges || nudges.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const nudge of nudges) {
      try {
        // Check if user has created a workspace since the nudge was scheduled
        const { count } = await supabaseAdmin
          .from("workspace_memberships")
          .select("id", { count: "exact", head: true })
          .eq("user_id", nudge.user_id);

        if (count && count > 0) {
          // User has onboarded — cancel this and all remaining nudges
          await supabaseAdmin.rpc("cancel_onboarding_nudges", {
            p_user_id: nudge.user_id,
          });
          skipped++;
          continue;
        }

        // Get user info for the email
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("email, full_name")
          .eq("id", nudge.user_id)
          .single();

        if (!user?.email) {
          console.warn(`No email for user ${nudge.user_id}, skipping nudge`);
          skipped++;
          continue;
        }

        // Build and send the email
        const { subject, html } = buildOnboardingNudgeEmail({
          userName: user.full_name || user.email,
          step: nudge.step,
        });

        await sendEmail({ to: user.email, subject, html });

        // Mark as sent
        await supabaseAdmin
          .from("onboarding_nudges")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", nudge.id);

        console.log(
          `[onboarding_nudge] Sent ${nudge.step} to ${user.email}`
        );
        sent++;
      } catch (err) {
        console.error(`Failed to process nudge ${nudge.id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, skipped, failed, total: nudges.length }),
      { status: 200 }
    );
  } catch (error) {
    console.error("process-onboarding-nudges error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});

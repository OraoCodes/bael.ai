const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
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

// ─── Email Templates ───────────────────────────────────────────────

interface InviteEmailParams {
  inviterName: string;
  workspaceName: string;
  role: string;
  token: string;
  expiresAt: string;
}

export function buildInviteEmail(params: InviteEmailParams) {
  const acceptUrl = `${SITE_URL}/invite/${params.token}`;
  const expiresDate = new Date(params.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = `${params.inviterName} invited you to ${params.workspaceName}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center">
          <div style="display:inline-block;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 12px;border-radius:99px;margin-bottom:16px">Team Invitation</div>
          <h1 style="margin:16px 0 8px;font-size:22px;color:#18181b;font-weight:700">You've been invited!</h1>
          <p style="margin:0;color:#71717a;font-size:15px;line-height:1.5">
            <strong style="color:#18181b">${params.inviterName}</strong> has invited you to join
            <strong style="color:#18181b">${params.workspaceName}</strong> as a <strong style="color:#18181b">${params.role}</strong>.
          </p>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:24px 32px;text-align:center">
          <a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none">Accept Invitation</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:0 32px 32px;text-align:center">
          <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5">
            This invitation expires on ${expiresDate}.<br>
            If you didn't expect this email, you can safely ignore it.
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Bael — Recruitment CRM</p>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}

interface WelcomeEmailParams {
  userName: string;
  workspaceName: string;
  workspaceSlug: string;
}

export function buildWelcomeEmail(params: WelcomeEmailParams) {
  const dashboardUrl = `${SITE_URL}/w/${params.workspaceSlug}`;
  const firstName = params.userName.split(" ")[0] || "there";

  const subject = `Welcome to Bael — ${params.workspaceName} is ready!`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Greeting -->
        <tr><td style="padding:40px 36px 0;text-align:center">
          <div style="font-size:40px;margin-bottom:12px">🎉</div>
          <h1 style="margin:0 0 8px;font-size:24px;color:#18181b;font-weight:700">Welcome aboard, ${firstName}!</h1>
          <p style="margin:0;color:#71717a;font-size:15px;line-height:1.6">
            Your workspace <strong style="color:#18181b">${params.workspaceName}</strong> is all set up and ready to go.
          </p>
        </td></tr>
        <!-- Quick Start -->
        <tr><td style="padding:28px 36px 0">
          <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#18181b">Here's how to get started:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:10px 0;vertical-align:top;width:32px">
                <div style="width:24px;height:24px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:13px;font-weight:700;line-height:24px;text-align:center">1</div>
              </td>
              <td style="padding:10px 0 10px 12px">
                <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">Post your first job</strong> — Create an open role and it'll appear on your public careers page.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;vertical-align:top;width:32px">
                <div style="width:24px;height:24px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:13px;font-weight:700;line-height:24px;text-align:center">2</div>
              </td>
              <td style="padding:10px 0 10px 12px">
                <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">Connect your inbox</strong> — Link Gmail so CVs are automatically parsed and added to your pipeline.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;vertical-align:top;width:32px">
                <div style="width:24px;height:24px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:13px;font-weight:700;line-height:24px;text-align:center">3</div>
              </td>
              <td style="padding:10px 0 10px 12px">
                <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.5"><strong style="color:#18181b">Invite your team</strong> — Add recruiters and hiring managers to collaborate on candidates.</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:28px 36px;text-align:center">
          <a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:12px 36px;border-radius:8px;text-decoration:none">Go to your workspace →</a>
        </td></tr>
        <!-- Divider -->
        <tr><td style="padding:0 36px">
          <div style="border-top:1px solid #e4e4e7"></div>
        </td></tr>
        <!-- Footer note -->
        <tr><td style="padding:20px 36px 32px;text-align:center">
          <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5">
            Need help? Just reply to this email — we'd love to hear from you.
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Bael — Recruitment CRM</p>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}

// ─── Onboarding Nudge Emails ───────────────────────────────────────

interface OnboardingNudgeParams {
  userName: string;
  step: "1h" | "24h" | "72h";
}

export function buildOnboardingNudgeEmail(params: OnboardingNudgeParams) {
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

interface RejectionEmailParams {
  candidateName: string;
  jobTitle: string;
  workspaceName: string;
  reason?: string;
}

export function buildRejectionEmail(params: RejectionEmailParams) {
  const subject = `Your application for ${params.jobTitle} at ${params.workspaceName}`;
  const reasonBlock = params.reason
    ? `<p style="margin:16px 0 0;color:#3f3f46;font-size:15px;line-height:1.6">${params.reason}</p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#18181b">${params.workspaceName}</p>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b">Application Update</h1>
          <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.6">
            Hi ${params.candidateName},
          </p>
          <p style="margin:12px 0 0;color:#3f3f46;font-size:15px;line-height:1.6">
            Thank you for your interest in the <strong>${params.jobTitle}</strong> position at <strong>${params.workspaceName}</strong>.
            After careful consideration, we have decided to move forward with other candidates at this time.
          </p>
          ${reasonBlock}
          <p style="margin:16px 0 0;color:#3f3f46;font-size:15px;line-height:1.6">
            We appreciate the time you invested in this process and wish you the best in your job search.
          </p>
          <p style="margin:24px 0 0;color:#3f3f46;font-size:15px;line-height:1.6">
            Warm regards,<br>
            <strong>${params.workspaceName}</strong>
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Powered by Bael — Recruitment CRM</p>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}

interface FollowUpEmailParams {
  candidateName: string;
  subject: string;
  body: string;
}

export function buildFollowUpEmail(params: FollowUpEmailParams) {
  const subject = params.subject || `Follow up with ${params.candidateName}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:18px;color:#18181b;font-weight:700">${subject}</h1>
          <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.6">${params.body}</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Bael — Recruitment CRM</p>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}

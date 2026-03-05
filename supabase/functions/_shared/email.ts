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

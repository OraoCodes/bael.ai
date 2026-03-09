/**
 * Shared Gmail API utilities for edge functions.
 */

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GmailLinkRow {
  id: string;
  user_id: string;
  workspace_id: string;
  gmail_address: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  label_id: string | null;
  sync_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  subject: string;
  bodyText: string;
  attachments: AttachmentInfo[];
}

export interface AttachmentInfo {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

export async function refreshGmailToken(
  supabaseAdmin: { from: (t: string) => unknown },
  link: GmailLinkRow,
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Return existing token if still valid (1-min buffer)
  if (new Date(link.token_expires_at) > new Date(Date.now() + 60_000)) {
    return link.access_token;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: link.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // deno-lint-ignore no-explicit-any
  await (supabaseAdmin as any)
    .from("gmail_links")
    .update({
      access_token: data.access_token,
      token_expires_at: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id);

  return data.access_token;
}

// ── Gmail API Helpers ─────────────────────────────────────────────────────────

export async function gmailFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

export async function listNewMessages(
  accessToken: string,
  labelId: string | null,
  maxResults = 10
): Promise<string[]> {
  const query = labelId
    ? `has:attachment -label:bael-processed newer_than:7d`
    : `has:attachment newer_than:7d`;

  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });

  // If we have a label, exclude messages with that label
  if (labelId) {
    params.append("labelIds", "INBOX");
  }

  const res = await gmailFetch(accessToken, `/messages?${params}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail messages.list failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.messages || []).map((m: { id: string }) => m.id);
}

export async function getFullMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedEmail> {
  const res = await gmailFetch(accessToken, `/messages/${messageId}?format=full`);

  if (!res.ok) {
    throw new Error(`Gmail messages.get failed (${res.status}): ${await res.text()}`);
  }

  const msg = await res.json();
  const headers = msg.payload?.headers || [];

  const getHeader = (name: string): string =>
    headers.find((h: { name: string; value: string }) =>
      h.name.toLowerCase() === name.toLowerCase()
    )?.value || "";

  const from = parseEmailAddress(getHeader("From"));
  const subject = getHeader("Subject");
  const bodyText = extractBodyText(msg.payload);
  const attachments = extractAttachments(msg.payload);

  return {
    id: msg.id,
    threadId: msg.threadId,
    from,
    subject,
    bodyText,
    attachments,
  };
}

export async function downloadAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Uint8Array> {
  const res = await gmailFetch(
    accessToken,
    `/messages/${messageId}/attachments/${attachmentId}`
  );

  if (!res.ok) {
    throw new Error(`Gmail attachment download failed (${res.status})`);
  }

  const data = await res.json();
  // Gmail returns base64url-encoded data
  return base64UrlDecode(data.data);
}

export async function labelMessage(
  accessToken: string,
  messageId: string,
  labelId: string
): Promise<void> {
  const res = await gmailFetch(accessToken, `/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });

  if (!res.ok) {
    console.error(`Failed to label message ${messageId}: ${await res.text()}`);
  }
}

export async function sendReply(
  accessToken: string,
  originalMessage: ParsedEmail,
  bodyText: string
): Promise<void> {
  const replyTo = originalMessage.from.email;
  const subject = originalMessage.subject.startsWith("Re:")
    ? originalMessage.subject
    : `Re: ${originalMessage.subject}`;

  const rawEmail = [
    `To: ${replyTo}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${originalMessage.id}`,
    `References: ${originalMessage.id}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    bodyText,
  ].join("\r\n");

  const encoded = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmailFetch(accessToken, "/messages/send", {
    method: "POST",
    body: JSON.stringify({
      raw: encoded,
      threadId: originalMessage.threadId,
    }),
  });

  if (!res.ok) {
    console.error(`Failed to send reply: ${await res.text()}`);
  }
}

// ── Create Label ──────────────────────────────────────────────────────────────

export async function createOrGetLabel(
  accessToken: string,
  labelName = "bael-processed"
): Promise<string> {
  // Try to create the label
  const createRes = await gmailFetch(accessToken, "/labels", {
    method: "POST",
    body: JSON.stringify({
      name: labelName,
      labelListVisibility: "labelHide",
      messageListVisibility: "hide",
    }),
  });

  if (createRes.ok) {
    const label = await createRes.json();
    return label.id;
  }

  // If 409 (already exists), find it by name
  if (createRes.status === 409) {
    const listRes = await gmailFetch(accessToken, "/labels");
    if (listRes.ok) {
      const data = await listRes.json();
      const existing = (data.labels || []).find(
        (l: { name: string; id: string }) => l.name === labelName
      );
      if (existing) return existing.id;
    }
  }

  throw new Error(`Failed to create/find Gmail label: ${await createRes.text()}`);
}

// ── Internal Utilities ────────────────────────────────────────────────────────

export function parseEmailAddress(from: string): { name: string; email: string } {
  // Parse "John Doe <john@example.com>" or "john@example.com"
  const match = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^\s>]+@[^\s>]+)>?$/);
  if (match) {
    return {
      name: (match[1] || "").trim(),
      email: (match[2] || "").trim().toLowerCase(),
    };
  }
  return { name: "", email: from.trim().toLowerCase() };
}

function extractBodyText(payload: Record<string, unknown>): string {
  // deno-lint-ignore no-explicit-any
  const parts = (payload as any).parts || [];
  // deno-lint-ignore no-explicit-any
  const body = (payload as any).body;

  // Single-part message
  if (body?.data && (payload.mimeType === "text/plain" || !parts.length)) {
    return decodeBase64Url(body.data);
  }

  // Multi-part: prefer text/plain
  // deno-lint-ignore no-explicit-any
  for (const part of parts as any[]) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }

  // Fallback: text/html stripped of tags
  // deno-lint-ignore no-explicit-any
  for (const part of parts as any[]) {
    if (part.mimeType === "text/html" && part.body?.data) {
      const html = decodeBase64Url(part.body.data);
      return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  // Nested multipart
  // deno-lint-ignore no-explicit-any
  for (const part of parts as any[]) {
    if (part.parts) {
      const nested = extractBodyText(part);
      if (nested) return nested;
    }
  }

  return "";
}

function extractAttachments(payload: Record<string, unknown>): AttachmentInfo[] {
  const result: AttachmentInfo[] = [];
  const CV_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  // deno-lint-ignore no-explicit-any
  function walk(part: any) {
    if (
      part.filename &&
      part.body?.attachmentId &&
      CV_MIME_TYPES.includes(part.mimeType)
    ) {
      result.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      });
    }
    if (part.parts) {
      // deno-lint-ignore no-explicit-any
      for (const child of part.parts as any[]) {
        walk(child);
      }
    }
  }

  walk(payload);
  return result;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return atob(base64);
  }
}

function base64UrlDecode(data: string): Uint8Array {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

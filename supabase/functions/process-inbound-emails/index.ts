import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type GmailLinkRow,
  type ParsedEmail,
  refreshGmailToken,
  listNewMessages,
  getFullMessage,
  downloadAttachment,
  labelMessage,
  sendReply,
} from "../_shared/gmail.ts";

/**
 * Cron-triggered Edge Function that polls linked Gmail inboxes for CV emails.
 * Runs every 3 minutes via Supabase cron.
 *
 * For each new email with a PDF attachment:
 * 1. Parse the CV with Claude AI
 * 2. Match to the best open job
 * 3. Create/update the candidate
 * 4. Add to the job pipeline
 *
 * For emails without CV attachments: reply asking for CV.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

// ── AI Resume Parsing (reused from submit-application) ────────────────────────

interface AiParsedResume {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  skills: string[];
  experience: { title: string; company: string; location: string | null; start_date: string | null; end_date: string | null }[];
  education: { degree: string; field: string | null; institution: string; year: number | null }[];
  certifications: { name: string; issuer: string | null }[];
  total_years_experience: number | null;
  languages: string[];
  location: string | null;
  summary: string;
  resume_text: string;
}

const PARSE_SYSTEM_PROMPT = `You are an expert recruiter analyzing a resume PDF. Extract all structured information and produce a comprehensive candidate summary.
Return ONLY valid JSON — no markdown fences, no explanations, no text outside the JSON.

JSON schema:
{
  "first_name": "candidate's first name",
  "last_name": "candidate's last name",
  "email": "candidate's email from the resume, or null",
  "phone": "candidate's phone number, or null",
  "linkedin_url": "LinkedIn URL if present, or null",
  "skills": ["array of lowercase technical and professional skills, max 20"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country or null",
      "start_date": "Jan 2022 or 2022 or null",
      "end_date": "Mar 2024 or null (null means Present/current role)"
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "field": "Computer Science or null",
      "institution": "University Name",
      "year": 2020
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon Web Services or null"
    }
  ],
  "total_years_experience": 5,
  "languages": ["spoken languages, lowercase"],
  "location": "city, state/country or null",
  "summary": "2-3 paragraph narrative summary of this candidate. Write in third person.",
  "resume_text": "full plain-text extraction of all content from the resume"
}

Important:
- Extract the candidate's name, email, and phone from the resume
- List experience entries in reverse chronological order
- Infer total_years_experience from employment dates if not stated
- The summary should be detailed enough to understand the candidate without reading the resume`;

function sanitizeAiOutput(raw: Record<string, unknown>): AiParsedResume {
  const toStr = (v: unknown): string =>
    typeof v === "string" && v.trim() ? v.trim() : "";
  const toStrOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const toStrArr = (v: unknown, max: number): string[] =>
    Array.isArray(v)
      ? (v as unknown[])
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, max)
      : [];

  const experience = Array.isArray(raw.experience)
    ? (raw.experience as Record<string, unknown>[])
        .filter((e) => typeof e === "object" && e !== null)
        .map((e) => ({
          title: toStr(e.title),
          company: toStr(e.company),
          location: toStrOrNull(e.location),
          start_date: toStrOrNull(e.start_date),
          end_date: toStrOrNull(e.end_date),
        }))
        .filter((e) => e.title || e.company)
        .slice(0, 15)
    : [];

  const education = Array.isArray(raw.education)
    ? (raw.education as Record<string, unknown>[])
        .filter((e) => typeof e === "object" && e !== null)
        .map((e) => ({
          degree: toStr(e.degree),
          field: toStrOrNull(e.field),
          institution: toStr(e.institution),
          year: typeof e.year === "number" ? e.year : null,
        }))
        .filter((e) => e.degree || e.institution)
        .slice(0, 10)
    : [];

  const certifications = Array.isArray(raw.certifications)
    ? (raw.certifications as unknown[])
        .map((e) => {
          if (typeof e === "string") return { name: e.trim(), issuer: null };
          if (typeof e === "object" && e !== null) {
            const obj = e as Record<string, unknown>;
            return { name: toStr(obj.name), issuer: toStrOrNull(obj.issuer) };
          }
          return null;
        })
        .filter((e): e is { name: string; issuer: string | null } => !!e?.name)
        .slice(0, 10)
    : [];

  return {
    first_name: toStr(raw.first_name),
    last_name: toStr(raw.last_name),
    email: toStrOrNull(raw.email),
    phone: toStrOrNull(raw.phone),
    linkedin_url: toStrOrNull(raw.linkedin_url),
    skills: toStrArr(raw.skills, 20),
    experience,
    education,
    certifications,
    total_years_experience:
      typeof raw.total_years_experience === "number" && raw.total_years_experience >= 0
        ? Math.round(raw.total_years_experience)
        : null,
    languages: toStrArr(raw.languages, 10),
    location: toStrOrNull(raw.location),
    summary: toStr(raw.summary),
    resume_text: toStr(raw.resume_text),
  };
}

async function parseResumeFromBytes(pdfBytes: Uint8Array): Promise<AiParsedResume | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    let binary = "";
    for (let i = 0; i < pdfBytes.byteLength; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
    }
    const base64Pdf = btoa(binary);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: PARSE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
              },
              {
                type: "text",
                text: "Extract all candidate details from this resume and return them as JSON following the schema in your instructions.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", await response.text());
      return null;
    }

    const llmResult = await response.json();
    const rawText: string = llmResult.content?.[0]?.text ?? "";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start === -1 || end === -1) return null;
      try {
        parsed = JSON.parse(rawText.slice(start, end + 1));
      } catch {
        return null;
      }
    }

    return sanitizeAiOutput(parsed);
  } catch (e) {
    console.error("AI parsing failed:", e);
    return null;
  }
}

// ── AI Job Matching ───────────────────────────────────────────────────────────

interface JobMatchResult {
  job_id: string | null;
  confidence: number;
  reasoning: string;
}

async function matchEmailToJob(
  subject: string,
  bodySnippet: string,
  fromName: string,
  openJobs: { id: string; title: string; department: string | null; location: string | null }[]
): Promise<JobMatchResult> {
  // If only one open job, auto-assign
  if (openJobs.length === 1) {
    return {
      job_id: openJobs[0].id,
      confidence: 1.0,
      reasoning: "Only one open job in workspace",
    };
  }

  if (openJobs.length === 0) {
    return { job_id: null, confidence: 0, reasoning: "No open jobs in workspace" };
  }

  const jobList = openJobs
    .map((j, i) => `${i + 1}. ${j.id} | ${j.title} | ${j.department || "-"} | ${j.location || "-"}`)
    .join("\n");

  const prompt = `Given this email, determine which job the applicant is applying for.

Email subject: ${subject}
Email body (first 500 chars): ${bodySnippet.slice(0, 500)}
Sender: ${fromName}

Open jobs:
${jobList}

Return ONLY valid JSON: {"job_id": "uuid-or-null", "confidence": 0.0-1.0, "reasoning": "brief explanation"}
If no clear match, return job_id: null with low confidence.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Job matching AI error:", await response.text());
      return { job_id: null, confidence: 0, reasoning: "AI call failed" };
    }

    const result = await response.json();
    const text = result.content?.[0]?.text ?? "";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) return { job_id: null, confidence: 0, reasoning: "Parse failed" };
      parsed = JSON.parse(text.slice(start, end + 1));
    }

    const jobId = typeof parsed.job_id === "string" ? parsed.job_id : null;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

    // Verify the returned job_id is actually in our list
    if (jobId && !openJobs.some((j) => j.id === jobId)) {
      return { job_id: null, confidence: 0, reasoning: "AI returned unknown job_id" };
    }

    return { job_id: jobId, confidence, reasoning };
  } catch (e) {
    console.error("Job matching failed:", e);
    return { job_id: null, confidence: 0, reasoning: String(e) };
  }
}

// ── Embedding Generation (reused from submit-application) ─────────────────────

async function generateEmbedding(text: string): Promise<string | null> {
  const voyageKey = Deno.env.get("VOYAGE_API_KEY");
  if (!voyageKey || !text.trim()) return null;

  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        input: [text],
        model: "voyage-3",
        input_type: "document",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const vector: number[] = data.data?.[0]?.embedding;
    if (!Array.isArray(vector)) return null;
    return `[${vector.join(",")}]`;
  } catch {
    return null;
  }
}

// ── No-CV Reply Template ──────────────────────────────────────────────────────

const NO_CV_REPLY = `Thank you for reaching out regarding the position.

We noticed your email didn't include a CV/resume attachment. Could you please reply to this email with your CV attached as a PDF?

This will allow us to review your qualifications and get back to you as soon as possible.

Best regards`;

// ── Email Filtering ──────────────────────────────────────────────────────────

const SKIP_SENDER_PATTERNS = [
  /noreply/i, /no-reply/i, /notifications?@/i, /mailer-daemon/i,
  /calendar-notification/i, /postmaster@/i, /bounce/i,
  /news@/i, /newsletter@/i, /marketing@/i, /updates@/i,
  /support@/i, /billing@/i, /donotreply/i,
  /@google\.com$/i, /@googlemail\.com$/i, /@calendar\.google\.com$/i,
];

const SKIP_SUBJECT_PATTERNS = [
  /^(Accepted|Declined|Tentative|Updated invitation|Canceled):/i,
  /^Invitation:/i,
  /^Re: (Accepted|Declined|Tentative|Updated invitation|Canceled):/i,
  /has (accepted|declined|tentatively accepted)/i,
  /calendar event/i,
  /out of office/i,
  /automatic reply/i,
  /auto-?reply/i,
  /unsubscribe/i,
  /your receipt/i,
  /your order/i,
  /password reset/i,
  /verify your email/i,
  /^Delivered:/i,
  /^Undeliverable:/i,
];

function shouldSkipEmail(from: string, subject: string): boolean {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // Skip automated senders
  if (SKIP_SENDER_PATTERNS.some((p) => p.test(fromLower))) return true;

  // Skip calendar invites and automated subjects
  if (SKIP_SUBJECT_PATTERNS.some((p) => p.test(subject))) return true;

  // Skip if subject looks like a forwarded calendar event
  if (subjectLower.includes("@ ") && subjectLower.includes("(") && subjectLower.includes(")") &&
      (subjectLower.includes("am") || subjectLower.includes("pm"))) return true;

  return false;
}

// ── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (_req) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Auth guard: accept service role key OR valid user JWT
  const authHeader = _req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: CORS_HEADERS });
  }

  // If it's not the service role key, verify it's a valid user JWT
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: CORS_HEADERS });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let totalProcessed = 0;
  let totalFailed = 0;

  try {
    // Fetch active gmail_links due for sync
    const { data: links, error: fetchError } = await supabase.rpc(
      "fetch_due_gmail_syncs",
      { batch_size: 20 }
    );

    if (fetchError) {
      console.error("Failed to fetch gmail syncs:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: CORS_HEADERS });
    }

    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No syncs due" }), { status: 200, headers: CORS_HEADERS });
    }

    for (const link of links as GmailLinkRow[]) {
      try {
        await processGmailLink(supabase, link);
      } catch (err) {
        console.error(`Error processing gmail link ${link.id}:`, err);
        totalFailed++;

        // Mark the link with error
        const errMsg = err instanceof Error ? err.message : String(err);
        const isAuthError = errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("Token refresh failed");

        await supabase
          .from("gmail_links")
          .update({
            last_error: errMsg.slice(0, 500),
            ...(isAuthError && { sync_enabled: false }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", link.id);
      }
    }

    return new Response(
      JSON.stringify({ processed: totalProcessed, failed: totalFailed, links: links.length }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("process-inbound-emails error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS_HEADERS });
  }

  // ── Per-Link Processing ───────────────────────────────────────────────────

  async function processGmailLink(
    // deno-lint-ignore no-explicit-any
    supabase: any,
    link: GmailLinkRow
  ) {
    // 1. Refresh token
    const accessToken = await refreshGmailToken(
      supabase, link, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    );

    // 2. List new messages with attachments
    const messageIds = await listNewMessages(accessToken, link.label_id, 10);

    if (messageIds.length === 0) {
      await supabase
        .from("gmail_links")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("id", link.id);
      return;
    }

    // 3. Fetch open jobs for this workspace (for matching)
    const { data: openJobs } = await supabase
      .from("jobs")
      .select("id, title, department, location")
      .eq("workspace_id", link.workspace_id)
      .eq("status", "open")
      .is("deleted_at", null);

    // 4. Process each message
    for (const msgId of messageIds) {
      try {
        await processMessage(supabase, link, accessToken, msgId, openJobs || []);
        totalProcessed++;
      } catch (err) {
        console.error(`Error processing message ${msgId}:`, err);
        totalFailed++;

        // Log as failed
        await supabase.from("email_ingestion_logs").upsert(
          {
            workspace_id: link.workspace_id,
            gmail_link_id: link.id,
            gmail_message_id: msgId,
            from_email: "unknown",
            status: "failed",
            error_message: err instanceof Error ? err.message : String(err),
            processed_at: new Date().toISOString(),
          },
          { onConflict: "gmail_link_id,gmail_message_id" }
        );
      }
    }

    // 5. Update sync timestamp
    await supabase
      .from("gmail_links")
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq("id", link.id);
  }

  async function processMessage(
    // deno-lint-ignore no-explicit-any
    supabase: any,
    link: GmailLinkRow,
    accessToken: string,
    messageId: string,
    openJobs: { id: string; title: string; department: string | null; location: string | null }[]
  ) {
    // Check if already processed
    const { data: existing } = await supabase
      .from("email_ingestion_logs")
      .select("id")
      .eq("gmail_link_id", link.id)
      .eq("gmail_message_id", messageId)
      .maybeSingle();

    if (existing) return; // Already processed

    // Fetch full message
    const email: ParsedEmail = await getFullMessage(accessToken, messageId);

    // Skip non-application emails (calendar invites, automated senders, etc.)
    if (shouldSkipEmail(email.from.email, email.subject)) {
      console.log(`Skipping non-application email: "${email.subject}" from ${email.from.email}`);
      if (link.label_id) await labelMessage(accessToken, messageId, link.label_id);
      return;
    }

    // Insert initial log entry
    await supabase.from("email_ingestion_logs").insert({
      workspace_id: link.workspace_id,
      gmail_link_id: link.id,
      gmail_message_id: messageId,
      gmail_thread_id: email.threadId,
      from_email: email.from.email,
      from_name: email.from.name,
      subject: email.subject,
      status: "processing",
    });

    // Filter for PDF attachments only (DOCX not supported by Claude document vision)
    const pdfAttachments = email.attachments.filter(
      (a) => a.mimeType === "application/pdf" && a.size <= 10 * 1024 * 1024
    );

    // ── No CV Path ────────────────────────────────────────────────────────
    if (pdfAttachments.length === 0) {
      // Only reply if the email looks like it could be a job application attempt
      const subjectLower = email.subject.toLowerCase();
      const looksLikeApplication = /appli|cv|resume|position|role|job|interest|candidat|hiring/i.test(
        subjectLower + " " + email.bodyText.slice(0, 300).toLowerCase()
      );

      if (looksLikeApplication) {
        try {
          await sendReply(accessToken, email, NO_CV_REPLY);
        } catch (err) {
          console.error("Failed to send no-CV reply:", err);
        }
      }

      // Label and log
      if (link.label_id) await labelMessage(accessToken, messageId, link.label_id);

      await supabase
        .from("email_ingestion_logs")
        .update({
          status: looksLikeApplication ? "no_cv_replied" : "no_match",
          processed_at: new Date().toISOString(),
        })
        .eq("gmail_link_id", link.id)
        .eq("gmail_message_id", messageId);

      return;
    }

    // ── Has CV Path ───────────────────────────────────────────────────────

    // Download first PDF attachment
    const attachment = pdfAttachments[0];
    const pdfBytes = await downloadAttachment(accessToken, messageId, attachment.attachmentId);

    // Parse CV with AI
    const aiData = await parseResumeFromBytes(pdfBytes);

    // Determine candidate email: prefer CV-extracted, fallback to sender
    const candidateEmail = (aiData?.email || email.from.email).trim().toLowerCase();
    const candidateFirstName = aiData?.first_name || email.from.name.split(" ")[0] || "Unknown";
    const candidateLastName = aiData?.last_name || email.from.name.split(" ").slice(1).join(" ") || "Applicant";

    // Match to a job
    const matchResult = await matchEmailToJob(
      email.subject,
      email.bodyText,
      email.from.name,
      openJobs
    );

    // Upsert candidate
    const { data: existingCandidates } = await supabase
      .from("candidates")
      .select("id")
      .eq("workspace_id", link.workspace_id)
      .eq("email", candidateEmail)
      .is("deleted_at", null);

    const isExisting = existingCandidates && existingCandidates.length > 0;
    let candidateId: string;
    let candidateStatus: "created" | "updated" = "created";

    const aiProfile = aiData
      ? {
          skills: aiData.skills,
          experience: aiData.experience,
          education: aiData.education,
          certifications: aiData.certifications,
          total_years_experience: aiData.total_years_experience,
          languages: aiData.languages,
          location: aiData.location,
        }
      : undefined;

    if (isExisting) {
      candidateId = existingCandidates[0].id;
      candidateStatus = "updated";

      await supabase
        .from("candidates")
        .update({
          first_name: candidateFirstName,
          last_name: candidateLastName,
          ...(aiData?.phone && { phone: aiData.phone }),
          ...(aiData?.linkedin_url && { linkedin_url: aiData.linkedin_url }),
          ...(aiProfile && { ai_profile: aiProfile }),
          ...(aiData?.summary && { ai_summary: aiData.summary }),
          ...(aiData?.resume_text && { resume_text: aiData.resume_text }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);
    } else {
      const { data: newCandidate, error: candError } = await supabase
        .from("candidates")
        .insert({
          workspace_id: link.workspace_id,
          first_name: candidateFirstName,
          last_name: candidateLastName,
          email: candidateEmail,
          phone: aiData?.phone || null,
          linkedin_url: aiData?.linkedin_url || null,
          source: "email",
          created_by: link.user_id,
          ...(aiProfile && { ai_profile: aiProfile }),
          ...(aiData?.summary && { ai_summary: aiData.summary }),
          ...(aiData?.resume_text && { resume_text: aiData.resume_text }),
        })
        .select("id")
        .single();

      if (candError) throw candError;
      candidateId = newCandidate.id;
    }

    // Upload resume to storage
    const safeName = `resume_${Date.now()}.pdf`;
    const storagePath = `${link.workspace_id}/${candidateId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, pdfBytes, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (!uploadError) {
      await supabase
        .from("candidates")
        .update({ resume_path: storagePath })
        .eq("id", candidateId);
    }

    // Generate embedding
    if (aiData?.summary) {
      const vector = await generateEmbedding(aiData.summary);
      if (vector) {
        await supabase
          .from("candidates")
          .update({ embedding: vector })
          .eq("id", candidateId);
      }
    }

    // Create application (if job matched with sufficient confidence)
    let applicationId: string | null = null;
    let finalStatus = candidateStatus;
    const matchedJobId = matchResult.confidence >= 0.5 ? matchResult.job_id : null;

    if (matchedJobId) {
      // Get first non-terminal pipeline stage
      const { data: stage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("workspace_id", link.workspace_id)
        .eq("is_terminal", false)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (stage) {
        const { data: app, error: appError } = await supabase
          .from("candidate_applications")
          .insert({
            workspace_id: link.workspace_id,
            candidate_id: candidateId,
            job_id: matchedJobId,
            stage_id: stage.id,
            metadata: {
              source: "email_inbox",
              gmail_message_id: messageId,
              email_subject: email.subject,
              ai_match_confidence: matchResult.confidence,
              ai_match_reasoning: matchResult.reasoning,
            },
          })
          .select("id")
          .single();

        if (appError) {
          if (appError.code === "23505") {
            finalStatus = "duplicate_app" as typeof candidateStatus;
          } else {
            console.error("Application insert error:", appError);
          }
        } else {
          applicationId = app.id;
        }
      }
    } else {
      finalStatus = "no_match" as typeof candidateStatus;
    }

    // Log activity
    const matchedJob = openJobs.find((j) => j.id === matchedJobId);
    await supabase.from("activities").insert({
      workspace_id: link.workspace_id,
      actor_id: null,
      entity_type: "candidates",
      entity_id: candidateId,
      action: "email_ingested",
      metadata: {
        source: "gmail_inbox",
        from_email: email.from.email,
        subject: email.subject,
        job_id: matchedJobId,
        job_title: matchedJob?.title || null,
        match_confidence: matchResult.confidence,
        ai_parsed: aiData !== null,
      },
    });

    // Label message as processed
    if (link.label_id) await labelMessage(accessToken, messageId, link.label_id);

    // Update ingestion log
    await supabase
      .from("email_ingestion_logs")
      .update({
        status: finalStatus === "duplicate_app" ? "duplicate_app" : (matchedJobId ? candidateStatus : "no_match"),
        candidate_id: candidateId,
        job_id: matchedJobId,
        application_id: applicationId,
        ai_match_confidence: matchResult.confidence,
        ai_match_reasoning: matchResult.reasoning,
        processed_at: new Date().toISOString(),
      })
      .eq("gmail_link_id", link.id)
      .eq("gmail_message_id", messageId);
  }
});

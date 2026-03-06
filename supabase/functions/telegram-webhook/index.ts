import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Environment ─────────────────────────────────────────────────────────────

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_SECRET_TOKEN = Deno.env.get("TELEGRAM_SECRET_TOKEN");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://app.bael.ai";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

// ── Telegram types ──────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

// ── Job generation (copied from ai-generate-job) ───────────────────────────

interface AiJobOutput {
  title: string;
  description?: string;
  department?: string | null;
  employment_type?: string | null;
  seniority_level?: string | null;
  workplace_type?: string | null;
  job_function?: string | null;
  skills?: string[];
}

const VALID_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
];
const VALID_SENIORITY_LEVELS = [
  "intern",
  "entry",
  "mid",
  "senior",
  "lead",
  "director",
  "vp",
  "c_level",
];
const VALID_WORKPLACE_TYPES = ["on_site", "remote", "hybrid"];
const VALID_JOB_FUNCTIONS = [
  "engineering",
  "design",
  "product",
  "marketing",
  "sales",
  "operations",
  "hr",
  "finance",
  "support",
  "other",
];

function sanitizeOutput(raw: Record<string, unknown>): AiJobOutput {
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : null;
  if (!title) throw new Error("AI did not return a valid title");

  return {
    title,
    description:
      typeof raw.description === "string"
        ? raw.description.trim()
        : undefined,
    department:
      typeof raw.department === "string"
        ? raw.department.trim() || null
        : null,
    employment_type: VALID_EMPLOYMENT_TYPES.includes(
      raw.employment_type as string
    )
      ? (raw.employment_type as string)
      : null,
    seniority_level: VALID_SENIORITY_LEVELS.includes(
      raw.seniority_level as string
    )
      ? (raw.seniority_level as string)
      : null,
    workplace_type: VALID_WORKPLACE_TYPES.includes(
      raw.workplace_type as string
    )
      ? (raw.workplace_type as string)
      : null,
    job_function: VALID_JOB_FUNCTIONS.includes(raw.job_function as string)
      ? (raw.job_function as string)
      : null,
    skills: Array.isArray(raw.skills)
      ? (raw.skills as unknown[])
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10)
      : [],
  };
}

const JOB_SYSTEM_PROMPT = `You are an expert HR professional and job description writer.
Based on the role or person description provided, generate a complete job posting.
Return ONLY a valid JSON object — no markdown fences, no explanations, no text outside the JSON.

JSON schema:
{
  "title": "professional job title (required, infer from description)",
  "description": "full job description 200-400 words, plain text with \\n line breaks, covering: role overview, key responsibilities, required qualifications, nice-to-haves",
  "department": "department name or null",
  "employment_type": "one of: full_time, part_time, contract, internship — or null",
  "seniority_level": "one of: intern, entry, mid, senior, lead, director, vp, c_level — or null",
  "workplace_type": "one of: on_site, remote, hybrid — or null",
  "job_function": "one of: engineering, design, product, marketing, sales, operations, hr, finance, support, other — or null",
  "skills": ["array of up to 8 specific lowercase skills, e.g. react, typescript, figma"]
}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    }
  );
}

function parseJsonResponse(rawText: string): Record<string, unknown> | null {
  try {
    return JSON.parse(rawText);
  } catch {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(rawText.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    console.error("Anthropic API error:", await response.text());
    return null;
  }

  const result = await response.json();
  return result.content?.[0]?.text ?? null;
}

// ── Intent classification ───────────────────────────────────────────────────

type Intent = "CREATE_JOB" | "UPDATE_JOB" | "CONFIRM" | "OTHER";

async function classifyIntent(
  text: string,
  hasActiveJob: boolean
): Promise<Intent> {
  const systemPrompt = `You are an assistant inside a recruitment CRM. A recruiter sent the message below.
Classify their intent as exactly one of: CREATE_JOB, UPDATE_JOB, CONFIRM, OTHER.

Rules:
- CREATE_JOB: wants to post a new job (mentions a role, title, or asks to create)
- UPDATE_JOB: wants to modify the last created job (changes salary, title, location, skills, etc.)${hasActiveJob ? " — user has an active job context" : " — no active job, so default to CREATE_JOB if it looks like a job description"}
- CONFIRM: responds yes/confirm/ok/looks good/done to a previous bot prompt
- OTHER: greetings, off-topic, help requests, /help command

Return ONLY the intent word, nothing else.`;

  const raw = await callClaude(systemPrompt, text, 10);
  if (!raw) return "OTHER";

  const cleaned = raw.trim().toUpperCase();
  if (
    ["CREATE_JOB", "UPDATE_JOB", "CONFIRM", "OTHER"].includes(cleaned)
  ) {
    return cleaned as Intent;
  }
  return "OTHER";
}

// ── Job generation ──────────────────────────────────────────────────────────

async function generateJob(
  prompt: string
): Promise<AiJobOutput | null> {
  const raw = await callClaude(JOB_SYSTEM_PROMPT, prompt, 900);
  if (!raw) return null;

  const parsed = parseJsonResponse(raw);
  if (!parsed) return null;

  try {
    return sanitizeOutput(parsed);
  } catch {
    return null;
  }
}

// ── Rate limiting ───────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  telegram_chat_id: number;
  user_id: string | null;
  workspace_id: string | null;
  last_job_id: string | null;
  last_activity_at: string;
  rate_window_start: string;
  rate_request_count: number;
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  session: SessionRow,
  now: Date
): Promise<boolean> {
  const windowStart = new Date(session.rate_window_start);
  const elapsed = now.getTime() - windowStart.getTime();

  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    await supabase
      .from("telegram_sessions")
      .update({
        rate_window_start: now.toISOString(),
        rate_request_count: 1,
        updated_at: now.toISOString(),
      })
      .eq("id", session.id);
    return true;
  }

  const count = session.rate_request_count + 1;
  if (count > RATE_LIMIT_MAX) return false;

  await supabase
    .from("telegram_sessions")
    .update({
      rate_request_count: count,
      updated_at: now.toISOString(),
    })
    .eq("id", session.id);
  return true;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleLinking(
  supabase: ReturnType<typeof createClient>,
  chatId: number,
  telegramUsername: string | undefined,
  codeCandidate: string
): Promise<void> {
  const code = codeCandidate.trim().toUpperCase();

  const { data: linkCode } = await supabase
    .from("telegram_link_codes")
    .select("id, user_id, workspace_id, expires_at")
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!linkCode) {
    await sendMessage(
      chatId,
      "Invalid or expired code. Generate a new one in Settings > Integrations."
    );
    return;
  }

  // Mark code as used
  await supabase
    .from("telegram_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", linkCode.id);

  // Upsert telegram link
  const now = new Date().toISOString();
  await supabase.from("telegram_links").upsert(
    {
      user_id: linkCode.user_id,
      workspace_id: linkCode.workspace_id,
      telegram_chat_id: chatId,
      telegram_username: telegramUsername ?? null,
      linked_at: now,
      unlinked_at: null,
      updated_at: now,
    },
    { onConflict: "user_id,workspace_id" }
  );

  // Upsert session
  await supabase.from("telegram_sessions").upsert(
    {
      telegram_chat_id: chatId,
      user_id: linkCode.user_id,
      workspace_id: linkCode.workspace_id,
      last_job_id: null,
      last_activity_at: now,
      rate_window_start: now,
      rate_request_count: 0,
      updated_at: now,
    },
    { onConflict: "telegram_chat_id" }
  );

  await sendMessage(
    chatId,
    "Account linked! You can now create jobs by describing a role.\n\nExample: *Senior Backend Engineer, Node.js, remote, full-time*"
  );
}

async function handleCreateJob(
  supabase: ReturnType<typeof createClient>,
  session: SessionRow,
  text: string,
  chatId: number
): Promise<void> {
  await sendMessage(chatId, "Generating job post...");

  const jobData = await generateJob(text);
  if (!jobData) {
    await sendMessage(
      chatId,
      "Sorry, I couldn't generate a job from that. Try being more specific, e.g. *Senior React Engineer, remote, contract*."
    );
    return;
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      workspace_id: session.workspace_id,
      created_by: session.user_id,
      status: "draft",
      source_type: "telegram",
      ...jobData,
    })
    .select("id, title")
    .single();

  if (error || !job) {
    console.error("Job insert error:", error);
    await sendMessage(chatId, "Failed to save job. Please try again.");
    return;
  }

  // Update session context
  const now = new Date().toISOString();
  await supabase
    .from("telegram_sessions")
    .update({
      last_job_id: job.id,
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", session.id);

  // Log activity
  await supabase.from("activities").insert({
    workspace_id: session.workspace_id,
    actor_id: session.user_id,
    entity_type: "jobs",
    entity_id: job.id,
    action: "created",
    metadata: { source: "telegram" },
  });

  // Build URL
  const { data: ws } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", session.workspace_id)
    .single();

  const jobUrl = ws
    ? `${SITE_URL}/w/${ws.slug}/jobs/${job.id}`
    : SITE_URL;

  const summary = [
    `*${jobData.title}*`,
    jobData.seniority_level ? `Seniority: ${jobData.seniority_level}` : null,
    jobData.employment_type
      ? `Type: ${jobData.employment_type.replace("_", " ")}`
      : null,
    jobData.workplace_type ? `Workplace: ${jobData.workplace_type.replace("_", " ")}` : null,
    jobData.skills?.length
      ? `Skills: ${jobData.skills.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMessage(
    chatId,
    `Job draft created:\n\n${summary}\n\nReview and publish: ${jobUrl}\n\nReply to adjust — e.g. *"change location to New York"*`
  );
}

async function handleUpdateJob(
  supabase: ReturnType<typeof createClient>,
  session: SessionRow,
  text: string,
  chatId: number
): Promise<void> {
  if (!session.last_job_id) {
    await sendMessage(
      chatId,
      "No active job to update. Describe a role to create one first."
    );
    return;
  }

  const { data: currentJob } = await supabase
    .from("jobs")
    .select(
      "title, description, department, location, employment_type, salary_min, salary_max, salary_currency, skills, seniority_level, workplace_type, job_function"
    )
    .eq("id", session.last_job_id)
    .single();

  if (!currentJob) {
    await sendMessage(chatId, "Couldn't find the job to update.");
    return;
  }

  const updatePrompt = `Current job:\n${JSON.stringify(currentJob, null, 2)}\n\nUser request: "${text}"\n\nApply the requested changes and return the COMPLETE updated job as JSON using the same schema. Only modify fields the user mentioned. Keep everything else unchanged.`;

  const updated = await generateJob(updatePrompt);
  if (!updated) {
    await sendMessage(
      chatId,
      "Couldn't apply that update. Please be more specific."
    );
    return;
  }

  const { error } = await supabase
    .from("jobs")
    .update({ ...updated, updated_at: new Date().toISOString() })
    .eq("id", session.last_job_id)
    .eq("workspace_id", session.workspace_id);

  if (error) {
    console.error("Job update error:", error);
    await sendMessage(chatId, "Failed to update job.");
    return;
  }

  // Log activity
  await supabase.from("activities").insert({
    workspace_id: session.workspace_id,
    actor_id: session.user_id,
    entity_type: "jobs",
    entity_id: session.last_job_id,
    action: "updated",
    metadata: { source: "telegram" },
  });

  // Update session timestamp
  const now = new Date().toISOString();
  await supabase
    .from("telegram_sessions")
    .update({ last_activity_at: now, updated_at: now })
    .eq("id", session.id);

  await sendMessage(
    chatId,
    `Updated *${updated.title || currentJob.title}*. Reply with more changes or visit the app to publish.`
  );
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  const ok200 = () => new Response("ok", { status: 200 });

  if (req.method !== "POST") return ok200();

  // Verify Telegram webhook secret
  if (TELEGRAM_SECRET_TOKEN) {
    const header = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (header !== TELEGRAM_SECRET_TOKEN) {
      console.warn("Invalid Telegram secret token");
      return ok200();
    }
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return ok200();
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return ok200();
  }

  const message = update.message;
  if (!message?.text || !message.chat?.id) return ok200();

  // Only handle private chats
  if (message.chat.type !== "private") return ok200();

  const chatId = message.chat.id;
  const text = message.text.trim();
  const telegramUsername = message.from?.username;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();

  try {
    // Handle /help command
    if (text === "/help" || text === "/start") {
      await sendMessage(
        chatId,
        "*Bael Recruit Bot*\n\nI help you create job posts from Telegram.\n\n" +
          "1. Link your account with a code from Settings > Integrations\n" +
          "2. Describe a job role to create a draft\n" +
          "3. Reply to adjust the draft\n\n" +
          "Example: *Senior React Engineer, remote, 120-150k*"
      );
      return ok200();
    }

    // Load session
    const { data: session } = await supabase
      .from("telegram_sessions")
      .select("*")
      .eq("telegram_chat_id", chatId)
      .single();

    const isLinked = session?.user_id && session?.workspace_id;

    // ── UNLINKED PATH ───────────────────────────────────────────
    if (!isLinked) {
      const startMatch = text.match(/^\/start\s+([A-Z2-9]{6})$/i);
      const bareCode = /^[A-Z2-9]{6}$/i.test(text) ? text : null;
      const code = startMatch?.[1] ?? bareCode;

      if (code) {
        await handleLinking(supabase, chatId, telegramUsername, code);
      } else {
        await sendMessage(
          chatId,
          "To get started, go to Settings > Integrations in Bael and generate a link code, then send it here."
        );
      }
      return ok200();
    }

    // ── LINKED PATH ─────────────────────────────────────────────

    // Rate limit
    const allowed = await checkRateLimit(supabase, session as SessionRow, now);
    if (!allowed) {
      await sendMessage(
        chatId,
        "Too many requests. Please wait a minute and try again."
      );
      return ok200();
    }

    // Check session expiry for job context
    const lastActivity = new Date(session.last_activity_at);
    const sessionExpired =
      now.getTime() - lastActivity.getTime() > SESSION_EXPIRY_MS;
    const hasActiveJob = !!session.last_job_id && !sessionExpired;

    // If session expired, clear the job context
    if (sessionExpired && session.last_job_id) {
      await supabase
        .from("telegram_sessions")
        .update({ last_job_id: null, updated_at: now.toISOString() })
        .eq("id", session.id);
    }

    // Classify intent
    const intent = await classifyIntent(text, hasActiveJob);

    switch (intent) {
      case "CREATE_JOB":
        await handleCreateJob(
          supabase,
          session as SessionRow,
          text,
          chatId
        );
        break;

      case "UPDATE_JOB":
        if (!hasActiveJob) {
          // No active job, treat as create
          await handleCreateJob(
            supabase,
            session as SessionRow,
            text,
            chatId
          );
        } else {
          await handleUpdateJob(
            supabase,
            session as SessionRow,
            text,
            chatId
          );
        }
        break;

      case "CONFIRM": {
        if (hasActiveJob) {
          const { data: ws } = await supabase
            .from("workspaces")
            .select("slug")
            .eq("id", session.workspace_id)
            .single();
          const url = ws
            ? `${SITE_URL}/w/${ws.slug}/jobs/${session.last_job_id}`
            : SITE_URL;
          await sendMessage(
            chatId,
            `Great! Review and publish here: ${url}`
          );
        } else {
          await sendMessage(
            chatId,
            "Nothing to confirm. Describe a role to create a job post."
          );
        }
        break;
      }

      default:
        await sendMessage(
          chatId,
          "I can help you create or update job posts.\n\nTry: *Post a Senior React Engineer, remote, full-time*"
        );
    }
  } catch (err) {
    console.error("telegram-webhook error:", err);
    await sendMessage(chatId, "Something went wrong. Please try again.");
  }

  return ok200();
});

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  workspace_id: string;
  prompt: string;
}

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

const VALID_EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship"];
const VALID_SENIORITY_LEVELS = ["intern", "entry", "mid", "senior", "lead", "director", "vp", "c_level"];
const VALID_WORKPLACE_TYPES = ["on_site", "remote", "hybrid"];
const VALID_JOB_FUNCTIONS = ["engineering", "design", "product", "marketing", "sales", "operations", "hr", "finance", "support", "other"];

function sanitizeOutput(raw: Record<string, unknown>): AiJobOutput {
  const title = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : null;

  if (!title) throw new Error("AI did not return a valid title");

  const employment_type = VALID_EMPLOYMENT_TYPES.includes(raw.employment_type as string)
    ? (raw.employment_type as string)
    : null;

  const seniority_level = VALID_SENIORITY_LEVELS.includes(raw.seniority_level as string)
    ? (raw.seniority_level as string)
    : null;

  const workplace_type = VALID_WORKPLACE_TYPES.includes(raw.workplace_type as string)
    ? (raw.workplace_type as string)
    : null;

  const job_function = VALID_JOB_FUNCTIONS.includes(raw.job_function as string)
    ? (raw.job_function as string)
    : null;

  const skills = Array.isArray(raw.skills)
    ? (raw.skills as unknown[])
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return {
    title,
    description: typeof raw.description === "string" ? raw.description.trim() : undefined,
    department: typeof raw.department === "string" ? raw.department.trim() || null : null,
    employment_type,
    seniority_level,
    workplace_type,
    job_function,
    skills,
  };
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

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: GenerateRequest = await req.json();

    if (!body.prompt || body.prompt.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Prompt too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await supabaseAdmin
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", body.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert HR professional and job description writer.
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: "user", content: body.prompt.trim() }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const llmResult = await response.json();
    const rawText: string = llmResult.content?.[0]?.text ?? "";

    // Parse JSON — try direct parse first, then extract from braces
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start === -1 || end === -1) {
        console.error("No JSON found in response:", rawText);
        return new Response(JSON.stringify({ error: "generation_failed" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        parsed = JSON.parse(rawText.slice(start, end + 1));
      } catch {
        console.error("Failed to extract JSON:", rawText);
        return new Response(JSON.stringify({ error: "generation_failed" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let output: AiJobOutput;
    try {
      output = sanitizeOutput(parsed);
    } catch (e) {
      console.error("Sanitization failed:", e);
      return new Response(JSON.stringify({ error: "generation_failed" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-generate-job error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

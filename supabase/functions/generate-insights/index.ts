import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InsightRequest {
  workspace_id: string;
  force_refresh?: boolean;
}

interface CandidateRow {
  id: string;
  first_name: string;
  last_name: string;
  tags: string[] | null;
  notes: string | null;
  ai_profile: Record<string, unknown> | null;
  ai_summary: string | null;
}

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  skills: string[] | null;
  seniority_level: string | null;
  workplace_type: string | null;
  job_function: string | null;
}

const MAX_JOBS = 10;
const MAX_CANDIDATES_PER_JOB = 50;
const STALENESS_MS = 6 * 60 * 60 * 1000; // 6 hours
const MODEL = "claude-haiku-4-5-20251001";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate the requesting user
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

    const body: InsightRequest = await req.json();
    const { workspace_id, force_refresh = false } = body;

    // Verify workspace membership
    const { data: membership } = await supabaseAdmin
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check staleness — skip if recently computed
    if (!force_refresh) {
      const { data: recent } = await supabaseAdmin
        .from("ai_job_suggestions")
        .select("computed_at")
        .eq("workspace_id", workspace_id)
        .order("computed_at", { ascending: false })
        .limit(1);

      if (
        recent?.[0] &&
        new Date(recent[0].computed_at).getTime() > Date.now() - STALENESS_MS
      ) {
        return new Response(
          JSON.stringify({
            message: "Insights are still fresh",
            cached: true,
            jobs_processed: 0,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fetch open jobs
    const { data: openJobs, error: jobsError } = await supabaseAdmin
      .from("jobs")
      .select(
        "id, title, description, department, location, employment_type, skills, seniority_level, workplace_type, job_function"
      )
      .eq("workspace_id", workspace_id)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(MAX_JOBS);

    if (jobsError) throw jobsError;

    if (!openJobs || openJobs.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No open jobs",
          jobs_processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "AI insights not configured (missing API key)",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date().toISOString();
    let totalSuggestions = 0;

    // Process each open job sequentially
    for (const job of openJobs as JobRow[]) {
      // Get candidate IDs already applied to this job
      const { data: existingApps } = await supabaseAdmin
        .from("candidate_applications")
        .select("candidate_id")
        .eq("job_id", job.id)
        .eq("workspace_id", workspace_id)
        .is("deleted_at", null);

      const appliedIds = new Set(
        (existingApps || []).map((a: { candidate_id: string }) => a.candidate_id)
      );

      // Get dismissed candidate IDs for this job
      const { data: dismissed } = await supabaseAdmin
        .from("ai_job_suggestions")
        .select("candidate_id")
        .eq("job_id", job.id)
        .eq("workspace_id", workspace_id)
        .not("dismissed_at", "is", null);

      const dismissedIds = new Set(
        (dismissed || []).map((d: { candidate_id: string }) => d.candidate_id)
      );

      // Fetch candidates with AI profiles (most useful for matching)
      const { data: allCandidates } = await supabaseAdmin
        .from("candidates")
        .select("id, first_name, last_name, tags, notes, ai_profile, ai_summary")
        .eq("workspace_id", workspace_id)
        .is("deleted_at", null)
        .limit(200);

      // Filter out applied + dismissed, prefer candidates with AI data
      const eligible = (allCandidates || [])
        .filter(
          (c: CandidateRow) =>
            !appliedIds.has(c.id) && !dismissedIds.has(c.id)
        )
        .sort((a: CandidateRow, b: CandidateRow) => {
          // Prioritize candidates with richer profiles
          const scoreA = (a.ai_summary ? 2 : 0) + (a.ai_profile ? 1 : 0);
          const scoreB = (b.ai_summary ? 2 : 0) + (b.ai_profile ? 1 : 0);
          return scoreB - scoreA;
        })
        .slice(0, MAX_CANDIDATES_PER_JOB) as CandidateRow[];

      if (eligible.length === 0) continue;

      // Build the LLM prompt
      const candidateBlock = eligible
        .map((c, i) => {
          const profile = c.ai_profile as Record<string, unknown> | null;
          const skills = (profile?.skills as string[]) || [];
          const years = profile?.total_years_experience ?? "Unknown";
          return `[${i + 1}] ID: ${c.id}
Name: ${c.first_name} ${c.last_name}
Summary: ${c.ai_summary || "N/A"}
Skills: ${skills.join(", ") || "N/A"}
Experience: ${years} years
Tags: ${(c.tags || []).join(", ") || "None"}`;
        })
        .join("\n\n");

      const prompt = `You are a senior recruitment advisor. Evaluate each candidate's fit for the role below.
Consider: skill alignment, experience level, career trajectory, and domain fit.

## Role
Title: ${job.title}
Department: ${job.department || "N/A"}
Location: ${job.location || "Remote/Any"}
Type: ${job.employment_type || "Full-time"}
Seniority: ${job.seniority_level || "Not specified"}
Required Skills: ${(job.skills || []).join(", ") || "Not specified"}
Description: ${job.description || "No description provided"}

## Candidates
${candidateBlock}

Return ONLY a JSON array of the top 5 strongest matches (score >= 0.5). Skip weak matches entirely.
Format: [{"candidate_id": "uuid-here", "score": 0.85, "reasoning": "One concise sentence explaining why this candidate is a strong match."}]
Only output valid JSON, no other text.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        console.error(
          `LLM error for job ${job.id}:`,
          await response.text()
        );
        continue; // Skip this job, try the next
      }

      const llmResult = await response.json();
      const content = llmResult.content?.[0]?.text || "[]";

      let scores: Array<{
        candidate_id: string;
        score: number;
        reasoning: string;
      }>;
      try {
        // Strip markdown code fences the LLM sometimes wraps the response in
        const cleaned = content.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        scores = JSON.parse(cleaned);
      } catch {
        console.error(`Failed to parse LLM response for job ${job.id}:`, content);
        continue;
      }

      // Validate and filter scores
      const validScores = scores.filter(
        (s) =>
          s.candidate_id &&
          typeof s.score === "number" &&
          s.score >= 0 &&
          s.score <= 1 &&
          s.reasoning &&
          eligible.some((c) => c.id === s.candidate_id)
      );

      if (validScores.length === 0) continue;

      // Upsert results into ai_job_suggestions
      const { error: upsertError } = await supabaseAdmin
        .from("ai_job_suggestions")
        .upsert(
          validScores.map((s) => ({
            workspace_id,
            job_id: job.id,
            candidate_id: s.candidate_id,
            score: s.score,
            reasoning: s.reasoning,
            computed_at: now,
          })),
          { onConflict: "workspace_id,job_id,candidate_id" }
        );

      if (upsertError) {
        console.error(`Upsert error for job ${job.id}:`, upsertError);
        continue;
      }

      totalSuggestions += validScores.length;
    }

    // Log activity
    await supabaseAdmin.from("activities").insert({
      workspace_id,
      actor_id: user.id,
      entity_type: "workspaces",
      entity_id: workspace_id,
      action: "ai_insights_generated",
      metadata: {
        jobs_processed: openJobs.length,
        suggestions_created: totalSuggestions,
        model: MODEL,
      },
    });

    return new Response(
      JSON.stringify({
        jobs_processed: openJobs.length,
        suggestions_created: totalSuggestions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-insights error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MatchRequest {
  job_id: string;
  workspace_id: string;
  limit?: number;
}

/**
 * AI-assisted candidate-job matching.
 * Fetches job description and unmatched candidates, calls an LLM,
 * and writes match scores back to candidate_applications.ai_match_score.
 */

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

    const body: MatchRequest = await req.json();
    const matchLimit = body.limit || 20;

    // Verify user is a member of the workspace (authorization check)
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

    // Fetch job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("id, title, description, department, location, employment_type")
      .eq("id", body.job_id)
      .eq("workspace_id", body.workspace_id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch applications that need scoring (no recent ai_match_score)
    const { data: applications } = await supabaseAdmin
      .from("candidate_applications")
      .select(
        `
        id,
        candidate_id,
        ai_match_score,
        candidates!inner (
          first_name,
          last_name,
          notes,
          tags,
          metadata
        )
      `
      )
      .eq("job_id", body.job_id)
      .eq("workspace_id", body.workspace_id)
      .is("deleted_at", null)
      .limit(matchLimit);

    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No applications to score", scores: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter out recently scored applications (within 24 hours)
    const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;
    const toScore = applications.filter((app) => {
      if (!app.ai_match_score) return true;
      const score = app.ai_match_score as Record<string, unknown>;
      const computedAt = score.computed_at
        ? new Date(score.computed_at as string).getTime()
        : 0;
      return computedAt < staleThreshold;
    });

    if (toScore.length === 0) {
      return new Response(
        JSON.stringify({
          message: "All applications have recent scores",
          scores: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call LLM for scoring
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI matching not configured (missing API key)" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const candidateSummaries = toScore.map((app) => {
      const candidate = (app as Record<string, unknown>)
        .candidates as Record<string, unknown>;
      return {
        application_id: app.id,
        name: `${candidate.first_name} ${candidate.last_name}`,
        notes: candidate.notes || "",
        tags: candidate.tags || [],
        metadata: candidate.metadata || {},
      };
    });

    const prompt = `You are a recruitment AI assistant. Score each candidate's fit for the following job on a scale of 0.0 to 1.0, and provide a brief reasoning.

Job: ${job.title}
Department: ${job.department || "N/A"}
Location: ${job.location || "N/A"}
Type: ${job.employment_type || "N/A"}
Description: ${job.description || "No description provided"}

Candidates:
${candidateSummaries.map((c, i) => `${i + 1}. ${c.name} — Notes: ${c.notes} Tags: ${JSON.stringify(c.tags)}`).join("\n")}

Respond with a JSON array of objects: [{"application_id": "...", "score": 0.85, "reasoning": "..."}]
Only output valid JSON, no other text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI scoring failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const llmResult = await response.json();
    const content = llmResult.content?.[0]?.text || "[]";

    let scores: Array<{
      application_id: string;
      score: number;
      reasoning: string;
    }>;
    try {
      scores = JSON.parse(content);
    } catch {
      console.error("Failed to parse LLM response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Write scores back to candidate_applications
    const now = new Date().toISOString();
    for (const scoreEntry of scores) {
      await supabaseAdmin
        .from("candidate_applications")
        .update({
          ai_match_score: {
            score: scoreEntry.score,
            reasoning: scoreEntry.reasoning,
            computed_at: now,
          },
        })
        .eq("id", scoreEntry.application_id)
        .eq("workspace_id", body.workspace_id);
    }

    // Log the AI matching activity
    await supabaseAdmin.from("activities").insert({
      workspace_id: body.workspace_id,
      actor_id: user.id,
      entity_type: "jobs",
      entity_id: body.job_id,
      action: "ai_match_scored",
      metadata: {
        candidates_scored: scores.length,
        model: "claude-haiku-4-5-20251001",
      },
    });

    return new Response(JSON.stringify({ scores }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-match-candidates error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

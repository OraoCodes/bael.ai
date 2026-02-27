import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QueryInterpretation {
  hard_filters: {
    min_years_experience: number | null;
    required_skills: string[];
    required_companies: string[];
    location: string | null;
  };
  semantic_query: string;
  explanation: string;
}

interface RankedCandidate {
  candidate_id: string;
  rank: number;
  relevance_score: number;
  explanation: string;
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

    const body = await req.json();
    const { workspace_id, query, limit = 20 } = body;

    if (!workspace_id || !query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id or query" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check workspace membership
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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const voyageKey = Deno.env.get("VOYAGE_API_KEY");

    if (!apiKey || !voyageKey) {
      return new Response(
        JSON.stringify({ error: "AI services not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ===================================================================
    // Stage 1: Query Interpretation (Claude Haiku)
    // ===================================================================
    const interpretRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `You are a recruitment search assistant. Analyze the recruiter's search query and separate it into hard constraints (specific filterable criteria) and semantic intent (meaning-based matching).

Return ONLY valid JSON — no markdown, no extra text.

JSON schema:
{
  "hard_filters": {
    "min_years_experience": null or number,
    "required_skills": ["specific skill names, lowercase"],
    "required_companies": ["specific company names"],
    "location": "location string or null"
  },
  "semantic_query": "rephrased query optimized for embedding similarity search, capturing the essence of what kind of candidate is needed",
  "explanation": "brief explanation of how you interpreted the query"
}

Guidelines:
- Only extract hard filters when the query is specific (e.g. "5+ years" → min_years_experience: 5)
- Approximate terms like "around 5 years" → min_years_experience: 4
- "Senior" without years → min_years_experience: 5
- Keep semantic_query broad enough to find good matches via embeddings
- required_skills should only include explicitly mentioned skills`,
        messages: [
          {
            role: "user",
            content: query,
          },
        ],
      }),
    });

    if (!interpretRes.ok) {
      console.error("Query interpretation failed:", await interpretRes.text());
      return new Response(
        JSON.stringify({ error: "Query interpretation failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const interpretResult = await interpretRes.json();
    const interpretText: string = interpretResult.content?.[0]?.text ?? "";

    let interpretation: QueryInterpretation;
    try {
      interpretation = JSON.parse(interpretText);
    } catch {
      const start = interpretText.indexOf("{");
      const end = interpretText.lastIndexOf("}");
      if (start === -1 || end === -1) {
        // Fallback: use raw query as semantic query
        interpretation = {
          hard_filters: {
            min_years_experience: null,
            required_skills: [],
            required_companies: [],
            location: null,
          },
          semantic_query: query,
          explanation: "Used raw query as semantic search",
        };
      } else {
        try {
          interpretation = JSON.parse(interpretText.slice(start, end + 1));
        } catch {
          interpretation = {
            hard_filters: {
              min_years_experience: null,
              required_skills: [],
              required_companies: [],
              location: null,
            },
            semantic_query: query,
            explanation: "Used raw query as semantic search",
          };
        }
      }
    }

    // ===================================================================
    // Stage 2: Vector Retrieval
    // ===================================================================

    // Embed the semantic query via Voyage AI
    const voyageRes = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        input: [interpretation.semantic_query],
        model: "voyage-3",
        input_type: "query",
      }),
    });

    if (!voyageRes.ok) {
      console.error("Voyage embedding failed:", await voyageRes.text());
      return new Response(
        JSON.stringify({ error: "Query embedding failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const voyageData = await voyageRes.json();
    const queryEmbedding = voyageData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      return new Response(
        JSON.stringify({ error: "Failed to generate query embedding" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call match_candidates RPC
    const vectorStr = `[${queryEmbedding.join(",")}]`;
    const { data: vectorResults, error: matchErr } = await supabaseAdmin.rpc(
      "match_candidates",
      {
        p_workspace_id: workspace_id,
        p_embedding: vectorStr,
        p_match_count: 50,
        p_min_similarity: 0.25,
      }
    );

    if (matchErr) {
      console.error("match_candidates RPC error:", matchErr);
      return new Response(
        JSON.stringify({ error: "Vector search failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let candidates = (vectorResults ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      linkedin_url: string | null;
      resume_url: string | null;
      resume_path: string | null;
      source: string | null;
      tags: string[];
      notes: string;
      ai_profile: Record<string, unknown> | null;
      ai_summary: string | null;
      similarity: number;
    }>;

    // Apply hard filters as post-filters
    const filters = interpretation.hard_filters;

    if (filters.min_years_experience !== null) {
      candidates = candidates.filter((c) => {
        const exp =
          (c.ai_profile?.total_years_experience as number) ?? 0;
        return exp >= (filters.min_years_experience ?? 0);
      });
    }

    if (filters.required_skills.length > 0) {
      const requiredLower = filters.required_skills.map((s: string) =>
        s.toLowerCase()
      );
      candidates = candidates.filter((c) => {
        const skills = (c.ai_profile?.skills as string[]) ?? [];
        const candidateSkills = skills.map((s) => s.toLowerCase());
        return requiredLower.some((req: string) =>
          candidateSkills.some(
            (cs) => cs.includes(req) || req.includes(cs)
          )
        );
      });
    }

    if (filters.required_companies.length > 0) {
      const requiredLower = filters.required_companies.map((s: string) =>
        s.toLowerCase()
      );
      candidates = candidates.filter((c) => {
        const companies = (c.ai_profile?.companies as string[]) ?? [];
        const candidateCompanies = companies.map((s) => s.toLowerCase());
        return requiredLower.some((req: string) =>
          candidateCompanies.some(
            (cc) => cc.includes(req) || req.includes(cc)
          )
        );
      });
    }

    const totalSearched = candidates.length;

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          results: [],
          query_interpretation: interpretation,
          total_candidates_searched: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ===================================================================
    // Stage 3: LLM Reranking + Explanation (Claude Haiku)
    // ===================================================================

    // Take top 20 for reranking
    const toRerank = candidates.slice(0, 20);

    const candidateSummaries = toRerank
      .map((c, i) => {
        const profile = c.ai_profile ?? {};
        const skills = ((profile.skills as string[]) ?? []).join(", ") || "N/A";
        const totalYears = (profile.total_years_experience as number) ?? "Unknown";

        // Use structured experience if available, fall back to legacy arrays
        const expEntries = profile.experience as Array<{
          title: string;
          company: string;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
        }> | undefined;

        let experienceStr: string;
        if (expEntries && expEntries.length > 0) {
          experienceStr = expEntries
            .map((e) => {
              const dates = e.start_date
                ? `${e.start_date} — ${e.end_date ?? "Present"}`
                : "";
              const loc = e.location ? ` (${e.location})` : "";
              return `${e.title} at ${e.company}${loc}${dates ? ` [${dates}]` : ""}`;
            })
            .join("; ");
        } else {
          const titles = (profile.job_titles as string[]) ?? [];
          const companies = (profile.companies as string[]) ?? [];
          experienceStr =
            titles.map((t, j) => (companies[j] ? `${t} at ${companies[j]}` : t)).join("; ") ||
            "N/A";
        }

        const education = profile.education as Array<{
          degree: string;
          field?: string | null;
          institution: string;
          year?: number | null;
        }> | undefined;
        const educationStr = education?.length
          ? education.map((e) => {
              const parts = [e.degree, e.field, e.institution, e.year].filter(Boolean);
              return parts.join(", ");
            }).join("; ")
          : "N/A";

        return `[${i + 1}] ID: ${c.id}
Name: ${c.first_name} ${c.last_name}
Summary: ${c.ai_summary ?? "No summary available"}
Skills: ${skills}
Total Experience: ${totalYears} years
Work History: ${experienceStr}
Education: ${educationStr}
Similarity: ${c.similarity.toFixed(3)}`;
      })
      .join("\n\n");

    const rerankRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: `You are a recruitment matching expert. Given a recruiter's search query and a list of candidate profiles, rerank the candidates by relevance to the query and provide a brief, specific explanation for each match.

Return ONLY valid JSON — no markdown, no extra text.

Return a JSON array ordered by relevance (best match first), including only relevant candidates (skip poor matches):
[{
  "candidate_id": "uuid",
  "rank": 1,
  "relevance_score": 0.92,
  "explanation": "Strong match because..."
}]

Guidelines:
- relevance_score: 0.0 to 1.0 (1.0 = perfect match)
- explanation: 1-2 sentences, specific to why this candidate matches
- Only include candidates with relevance_score >= 0.4
- Consider skills match, experience level, career trajectory, and company background`,
        messages: [
          {
            role: "user",
            content: `Search Query: "${query}"
Query Interpretation: ${interpretation.explanation}

Candidates:
${candidateSummaries}`,
          },
        ],
      }),
    });

    if (!rerankRes.ok) {
      console.error("Reranking failed:", await rerankRes.text());
      // Fallback: return vector results without reranking
      const fallbackResults = toRerank.slice(0, limit).map((c, i) => ({
        candidate_id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        ai_summary: c.ai_summary,
        ai_profile: c.ai_profile,
        similarity: c.similarity,
        relevance_score: c.similarity,
        rank: i + 1,
        explanation: "Ranked by embedding similarity",
      }));

      return new Response(
        JSON.stringify({
          results: fallbackResults,
          query_interpretation: interpretation,
          total_candidates_searched: totalSearched,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rerankResult = await rerankRes.json();
    const rerankText: string = rerankResult.content?.[0]?.text ?? "";

    let rankings: RankedCandidate[];
    try {
      rankings = JSON.parse(rerankText);
    } catch {
      const start = rerankText.indexOf("[");
      const end = rerankText.lastIndexOf("]");
      if (start === -1 || end === -1) {
        rankings = [];
      } else {
        try {
          rankings = JSON.parse(rerankText.slice(start, end + 1));
        } catch {
          rankings = [];
        }
      }
    }

    // Build final results by joining rankings with candidate data
    const candidateMap = new Map(toRerank.map((c) => [c.id, c]));
    const results = rankings
      .filter((r) => candidateMap.has(r.candidate_id))
      .slice(0, limit)
      .map((r) => {
        const c = candidateMap.get(r.candidate_id)!;
        return {
          candidate_id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          ai_summary: c.ai_summary,
          ai_profile: c.ai_profile,
          similarity: c.similarity,
          relevance_score: r.relevance_score,
          rank: r.rank,
          explanation: r.explanation,
        };
      });

    return new Response(
      JSON.stringify({
        results,
        query_interpretation: interpretation,
        total_candidates_searched: totalSearched,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("ai-search-candidates error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

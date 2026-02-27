import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const { workspace_id, candidate_id, candidate_ids } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const voyageKey = Deno.env.get("VOYAGE_API_KEY");
    if (!voyageKey) {
      return new Response(
        JSON.stringify({ error: "Embedding service not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Resolve candidate IDs
    const ids: string[] = candidate_ids
      ? candidate_ids
      : candidate_id
      ? [candidate_id]
      : [];

    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing candidate_id or candidate_ids" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch candidates' ai_summary
    const { data: candidates, error: fetchErr } = await supabaseAdmin
      .from("candidates")
      .select("id, ai_summary")
      .eq("workspace_id", workspace_id)
      .in("id", ids)
      .is("deleted_at", null)
      .not("ai_summary", "is", null);

    if (fetchErr) throw fetchErr;

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ embedded: 0, message: "No candidates with AI summaries found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Voyage AI to generate embeddings
    const texts = candidates.map((c) => c.ai_summary as string);

    const voyageRes = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: "voyage-3",
        input_type: "document",
      }),
    });

    if (!voyageRes.ok) {
      const errText = await voyageRes.text();
      console.error("Voyage API error:", errText);
      return new Response(
        JSON.stringify({ error: "Embedding generation failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const voyageData = await voyageRes.json();
    const embeddings = voyageData.data as Array<{
      embedding: number[];
      index: number;
    }>;

    // Store embeddings in DB
    let embedded = 0;
    for (const item of embeddings) {
      const candidate = candidates[item.index];
      const vectorStr = `[${item.embedding.join(",")}]`;

      const { error: updateErr } = await supabaseAdmin
        .from("candidates")
        .update({ embedding: vectorStr })
        .eq("id", candidate.id)
        .eq("workspace_id", workspace_id);

      if (updateErr) {
        console.error(
          `Failed to store embedding for ${candidate.id}:`,
          updateErr
        );
      } else {
        embedded++;
      }
    }

    return new Response(JSON.stringify({ embedded }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-embed-candidate error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

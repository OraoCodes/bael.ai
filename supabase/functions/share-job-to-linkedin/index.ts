import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://app.bael.ai";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth user
    const authHeader = req.headers.get("Authorization")!;
    const supabaseUser = createClient(
      SUPABASE_URL,
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

    const { job_id, workspace_id } = await req.json();
    if (!job_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "job_id and workspace_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check membership (CAN_WRITE: owner, admin, recruiter)
    const { data: membership } = await supabaseAdmin
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (
      !membership ||
      !["owner", "admin", "recruiter"].includes(membership.role)
    ) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load job — must be open with a slug
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select(
        "id, title, description, location, employment_type, workplace_type, seniority_level, skills, slug, status, linkedin_image_url"
      )
      .eq("id", job_id)
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status !== "open" || !job.slug) {
      return new Response(
        JSON.stringify({
          error: "Job must be open and have a public URL to share",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Load LinkedIn link
    const { data: linkedinLink } = await supabaseAdmin
      .from("linkedin_links")
      .select("*")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .is("unlinked_at", null)
      .single();

    if (!linkedinLink) {
      return new Response(
        JSON.stringify({ error: "LinkedIn not connected" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check token expiry
    if (new Date(linkedinLink.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          error: "LinkedIn token expired. Please reconnect in Settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get workspace slug + name for public URL
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("slug, name")
      .eq("id", workspace_id)
      .single();

    const publicUrl = ws
      ? `${SITE_URL}/jobs/${ws.slug}/${job.slug}`
      : SITE_URL;

    // Unicode bold helper (Sans-Serif Bold — renders in LinkedIn feed)
    function toBold(text: string): string {
      return text.split("").map((c) => {
        const code = c.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + code - 65); // A-Z
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + code - 97); // a-z
        if (code >= 48 && code <= 57)  return String.fromCodePoint(0x1D7EC + code - 48); // 0-9
        return c;
      }).join("");
    }

    function titleCase(str: string): string {
      return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Build detail lines — one per line, trailing " ·" on all but the last
    const detailParts = [
      job.location        ? `📍 ${job.location}` : null,
      job.employment_type ? `💼 ${titleCase(job.employment_type)}` : null,
      job.workplace_type  ? `🏢 ${titleCase(job.workplace_type)}` : null,
      job.seniority_level ? `📊 ${titleCase(job.seniority_level)} level` : null,
    ].filter(Boolean) as string[];

    const detailLines = detailParts
      .map((part, i) => i < detailParts.length - 1 ? `${part} ·` : part)
      .join("\n");

    // Job title → CamelCase hashtag, e.g. "Senior DevOps Engineer" → #SeniorDevOpsEngineer
    const titleHashtag = `#${job.title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")}`;

    const skillHashtags = (job.skills?.slice(0, 4) || [])
      .map((s: string) => `#${s.replace(/[^a-zA-Z0-9]/g, "").replace(/^\w/, (c: string) => c.toUpperCase())}`)
      .join(" ");

    const hashtags = `#Hiring #OpenToWork ${titleHashtag} ${skillHashtags}`.trim();

    // Helper to assemble commentary with consistent spacing:
    // title → details → [blank] → apply line → [blank] → hashtags
    function buildCommentary(applyLine: string): string {
      return [
        `🚀 ${toBold(`We're hiring: ${job.title}!`)}`,
        detailLines || null,
        "",
        applyLine,
        "",
        hashtags,
      ].filter((line) => line !== null).join("\n").trim();
    }

    // ── Build post content: image post OR article link card ──────────────────
    // If the job has a linkedin_image_url, upload it to LinkedIn and post as
    // a media/image post (full image visible in feed, URL in commentary text).
    // Otherwise fall back to the article link card (auto OG image + clickable card).

    let postContent: Record<string, unknown>;

    if (job.linkedin_image_url) {
      // Step 1: Initialize image upload with LinkedIn
      const initRes = await fetch(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${linkedinLink.access_token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202601",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: linkedinLink.linkedin_profile_id,
            },
          }),
        }
      );

      if (!initRes.ok) {
        const err = await initRes.text();
        console.error("LinkedIn image init failed:", err);
        return new Response(
          JSON.stringify({ error: "Failed to initialize LinkedIn image upload" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { value: { uploadUrl, image: imageUrn } } = await initRes.json();

      // Step 2: Fetch the image from Supabase Storage and upload to LinkedIn
      const imgRes = await fetch(job.linkedin_image_url);
      if (!imgRes.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch job image from storage" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const imgBuffer = await imgRes.arrayBuffer();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${linkedinLink.access_token}`,
          "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
        },
        body: imgBuffer,
      });

      if (!uploadRes.ok) {
        console.error("LinkedIn image upload failed:", await uploadRes.text());
        return new Response(
          JSON.stringify({ error: "Failed to upload image to LinkedIn" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Image post — URL embedded in text since there's no link card
      postContent = {
        author: linkedinLink.linkedin_profile_id,
        commentary: buildCommentary(`👉 ${toBold("Apply now")} → ${publicUrl}`),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          media: { id: imageUrn },
        },
        lifecycleState: "PUBLISHED",
      };
    } else {
      // Article link card — LinkedIn auto-pulls OG image from the job URL
      const cardDescription = job.description
        ? job.description.replace(/\n/g, " ").trim().slice(0, 200)
        : `Join ${ws?.name || "our team"} as a ${job.title}. Apply now on bael.ai.`;

      const cardTitle = ws?.name ? `${job.title} at ${ws.name}` : job.title;

      postContent = {
        author: linkedinLink.linkedin_profile_id,
        commentary: buildCommentary(`👉 ${toBold("Apply now")} — link in card below`),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          article: {
            source: publicUrl,
            title: cardTitle,
            description: cardDescription,
          },
        },
        lifecycleState: "PUBLISHED",
      };
    }

    // Call LinkedIn Posts API
    const linkedinRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${linkedinLink.access_token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202601",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postContent),
    });

    if (!linkedinRes.ok) {
      const errBody = await linkedinRes.text();
      console.error("LinkedIn Posts API error:", linkedinRes.status, errBody);
      return new Response(
        JSON.stringify({ error: "Failed to share on LinkedIn" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // LinkedIn returns the post ID in the x-restli-id header
    const linkedinPostId =
      linkedinRes.headers.get("x-restli-id") || null;

    // Log to linkedin_shares
    await supabaseAdmin.from("linkedin_shares").insert({
      workspace_id,
      job_id,
      shared_by: user.id,
      linkedin_post_id: linkedinPostId,
    });

    // Log activity
    await supabaseAdmin.from("activities").insert({
      workspace_id,
      actor_id: user.id,
      entity_type: "jobs",
      entity_id: job_id,
      action: "shared",
      metadata: { source: "linkedin", linkedin_post_id: linkedinPostId },
    });

    return new Response(
      JSON.stringify({
        success: true,
        linkedin_post_id: linkedinPostId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("share-job-to-linkedin error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

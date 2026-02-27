import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExperienceEntry {
  title: string;
  company: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface EducationEntry {
  degree: string;
  field: string | null;
  institution: string;
  year: number | null;
}

interface CertificationEntry {
  name: string;
  issuer: string | null;
}

interface AiParsedResume {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  total_years_experience: number | null;
  languages: string[];
  location: string | null;
  summary: string;
  resume_text: string;
}

const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4MB

function sanitizeOutput(raw: Record<string, unknown>): AiParsedResume {
  const first_name =
    typeof raw.first_name === "string" && raw.first_name.trim()
      ? raw.first_name.trim()
      : null;
  const last_name =
    typeof raw.last_name === "string" && raw.last_name.trim()
      ? raw.last_name.trim()
      : null;

  if (!first_name || !last_name) {
    throw new Error("AI did not return a valid name");
  }

  const toStringOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const toStringArray = (v: unknown, max: number): string[] =>
    Array.isArray(v)
      ? (v as unknown[])
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, max)
      : [];

  const experience: ExperienceEntry[] = Array.isArray(raw.experience)
    ? (raw.experience as unknown[])
        .filter(
          (e): e is Record<string, unknown> =>
            typeof e === "object" && e !== null
        )
        .map((e) => ({
          title: typeof e.title === "string" ? e.title.trim() : "",
          company: typeof e.company === "string" ? e.company.trim() : "",
          location: toStringOrNull(e.location),
          start_date: toStringOrNull(e.start_date),
          end_date: toStringOrNull(e.end_date),
        }))
        .filter((e) => e.title || e.company)
        .slice(0, 15)
    : [];

  const education: EducationEntry[] = Array.isArray(raw.education)
    ? (raw.education as unknown[])
        .filter(
          (e): e is Record<string, unknown> =>
            typeof e === "object" && e !== null
        )
        .map((e) => ({
          degree: typeof e.degree === "string" ? e.degree.trim() : "",
          field: toStringOrNull(e.field),
          institution:
            typeof e.institution === "string" ? e.institution.trim() : "",
          year: typeof e.year === "number" ? e.year : null,
        }))
        .filter((e) => e.degree || e.institution)
        .slice(0, 10)
    : [];

  const certifications: CertificationEntry[] = Array.isArray(
    raw.certifications
  )
    ? (raw.certifications as unknown[])
        .filter(
          (e): e is Record<string, unknown> | string =>
            (typeof e === "object" && e !== null) || typeof e === "string"
        )
        .map((e) => {
          if (typeof e === "string") return { name: e.trim(), issuer: null };
          const obj = e as Record<string, unknown>;
          return {
            name: typeof obj.name === "string" ? obj.name.trim() : "",
            issuer: toStringOrNull(obj.issuer),
          };
        })
        .filter((e) => e.name)
        .slice(0, 10)
    : [];

  const totalYears =
    typeof raw.total_years_experience === "number" &&
    raw.total_years_experience >= 0
      ? Math.round(raw.total_years_experience)
      : null;

  return {
    first_name,
    last_name,
    email: toStringOrNull(raw.email),
    phone: toStringOrNull(raw.phone),
    linkedin_url: toStringOrNull(raw.linkedin_url),
    skills: toStringArray(raw.skills, 20),
    experience,
    education,
    certifications,
    total_years_experience: totalYears,
    languages: toStringArray(raw.languages, 10),
    location: toStringOrNull(raw.location),
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : "",
    resume_text:
      typeof raw.resume_text === "string" && raw.resume_text.trim()
        ? raw.resume_text.trim()
        : "",
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

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid form data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = formData.get("workspace_id");
    const file = formData.get("file");

    if (!workspaceId || typeof workspaceId !== "string") {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing PDF file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.type !== "application/pdf") {
      return new Response(JSON.stringify({ error: "File must be a PDF" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > MAX_PDF_BYTES) {
      return new Response(
        JSON.stringify({ error: "PDF must be under 4MB" }),
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
      .eq("workspace_id", workspaceId)
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

    // Base64-encode the PDF
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Pdf = btoa(binary);

    const systemPrompt = `You are an expert recruiter analyzing a resume PDF. Extract all structured information and produce a comprehensive candidate summary.
Return ONLY valid JSON — no markdown fences, no explanations, no text outside the JSON.

JSON schema:
{
  "first_name": "candidate's first name",
  "last_name": "candidate's last name",
  "email": "email address or null",
  "phone": "phone number or null",
  "linkedin_url": "LinkedIn profile URL or null",
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
  "location": "city, state/country or null (most recent or stated location)",
  "summary": "2-3 paragraph narrative summary of this candidate's profile, career trajectory, strengths, and notable achievements. Write in third person.",
  "resume_text": "full plain-text extraction of all content from the resume, preserving section structure with line breaks"
}

Important:
- List experience entries in reverse chronological order (most recent first)
- For each experience entry, include start/end dates exactly as shown on the resume (e.g. "Jan 2022", "2020", "Mar 2024"). Use null for end_date if it's the current/present role
- Include location per role if stated on the resume
- Infer total_years_experience from employment dates if not stated explicitly
- For education, separate the degree type (e.g. "Bachelor of Science") from the field of study (e.g. "Computer Science")
- For certifications, include the issuing body/organization if mentioned
- For skills, extract both technical skills (languages, frameworks, tools) and domain skills
- The summary should be detailed enough to understand the candidate without reading the resume
- resume_text should be a faithful plain-text rendering of the PDF content`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf,
                },
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
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI extraction failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
        return new Response(
          JSON.stringify({ error: "extraction_failed" }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      try {
        parsed = JSON.parse(rawText.slice(start, end + 1));
      } catch {
        console.error("Failed to extract JSON:", rawText);
        return new Response(
          JSON.stringify({ error: "extraction_failed" }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    let output: AiParsedResume;
    try {
      output = sanitizeOutput(parsed);
    } catch (e) {
      console.error("Sanitization failed:", e);
      return new Response(JSON.stringify({ error: "extraction_failed" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-parse-resume error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

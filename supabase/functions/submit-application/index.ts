import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── AI Parsing ────────────────────────────────────────────────────────────

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

const PARSE_SYSTEM_PROMPT = `You are an expert recruiter analyzing a resume PDF. Extract all structured information and produce a comprehensive candidate summary.
Return ONLY valid JSON — no markdown fences, no explanations, no text outside the JSON.

JSON schema:
{
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
- For each experience entry, include start/end dates exactly as shown on the resume. Use null for end_date if it is the current/present role
- Infer total_years_experience from employment dates if not stated explicitly
- For skills, extract both technical skills (languages, frameworks, tools) and domain skills
- The summary should be detailed enough to understand the candidate without reading the resume
- resume_text should be a faithful plain-text rendering of the PDF content`;

function sanitizeAiOutput(raw: Record<string, unknown>): AiParsedResume {
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
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
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
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
        .map((e) => ({
          degree: typeof e.degree === "string" ? e.degree.trim() : "",
          field: toStringOrNull(e.field),
          institution: typeof e.institution === "string" ? e.institution.trim() : "",
          year: typeof e.year === "number" ? e.year : null,
        }))
        .filter((e) => e.degree || e.institution)
        .slice(0, 10)
    : [];

  const certifications: CertificationEntry[] = Array.isArray(raw.certifications)
    ? (raw.certifications as unknown[])
        .filter((e): e is Record<string, unknown> | string =>
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

  return {
    skills: toStringArray(raw.skills, 20),
    experience,
    education,
    certifications,
    total_years_experience:
      typeof raw.total_years_experience === "number" && raw.total_years_experience >= 0
        ? Math.round(raw.total_years_experience)
        : null,
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

async function parseResumeWithAI(file: File): Promise<AiParsedResume | null> {
  // Only Claude document vision supports PDFs
  if (file.type !== "application/pdf") return null;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — skipping AI parsing");
    return null;
  }

  try {
    // Base64-encode the PDF
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Pdf = btoa(binary);

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

// ─── Vector Embedding ──────────────────────────────────────────────────────

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

    if (!res.ok) {
      console.error("Voyage API error:", await res.text());
      return null;
    }

    const data = await res.json();
    const vector: number[] = data.data?.[0]?.embedding;
    if (!Array.isArray(vector)) return null;

    return `[${vector.join(",")}]`;
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return null;
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse multipart form data
    const formData = await req.formData();
    const jobId = formData.get("job_id") as string;
    const firstName = (formData.get("first_name") as string || "").trim();
    const lastName = (formData.get("last_name") as string || "").trim();
    const email = (formData.get("email") as string || "").trim().toLowerCase();
    const phone = (formData.get("phone") as string || "").trim() || null;
    const linkedinUrl = (formData.get("linkedin_url") as string || "").trim() || null;
    const coverLetter = (formData.get("cover_letter") as string || "").trim() || null;
    const resumeFile = formData.get("resume") as File | null;
    const customAnswersRaw = formData.get("custom_answers") as string | null;
    const honeypot = formData.get("website") as string | null;

    // Honeypot — silent success for bots
    if (honeypot) {
      return json({ success: true, message: "Application submitted" });
    }

    if (!jobId || !firstName || !lastName || !email) {
      return json({ error: "job_id, first_name, last_name, and email are required" }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: "Invalid email address" }, 400);
    }

    const hasResume = resumeFile && resumeFile.size > 0;

    if (hasResume) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(resumeFile.type)) {
        return json({ error: "Resume must be PDF, DOC, or DOCX" }, 400);
      }
      if (resumeFile.size > 5 * 1024 * 1024) {
        return json({ error: "Resume must be under 5MB" }, 400);
      }
    }

    // ── Verify job is open and public board is enabled ──────────────────────
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, workspace_id, title, status, application_form")
      .eq("id", jobId)
      .eq("status", "open")
      .is("deleted_at", null)
      .single();

    if (jobError || !job) {
      return json({ error: "Job not found or not accepting applications" }, 404);
    }

    const { data: settings } = await supabase
      .from("workspace_settings")
      .select("public_board_enabled")
      .eq("workspace_id", job.workspace_id)
      .single();

    if (!settings?.public_board_enabled) {
      return json({ error: "Job board is not enabled for this workspace" }, 403);
    }

    // ── Rate limit: max 10 applications per email per hour ──────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: existingCandidates } = await supabase
      .from("candidates")
      .select("id, ai_profile, ai_summary")
      .eq("workspace_id", job.workspace_id)
      .eq("email", email)
      .is("deleted_at", null);

    if (existingCandidates && existingCandidates.length > 0) {
      const { count: recentCount } = await supabase
        .from("candidate_applications")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", existingCandidates[0].id)
        .gte("applied_at", oneHourAgo);

      if (recentCount && recentCount >= 10) {
        return json({ error: "Too many applications. Please try again later." }, 429);
      }
    }

    // ── Upload resume first (needed before AI parse) ────────────────────────
    let resumePath: string | null = null;
    let resumeFileForParsing: File | null = null;

    if (hasResume) {
      // We need a temporary candidate ID placeholder for the storage path.
      // Use a deterministic temp path; we'll move it after candidate creation.
      // Simpler: upload to workspace-level temp path, update after.
      const ext = resumeFile.name.split(".").pop() || "pdf";
      const safeName = `resume_${Date.now()}.${ext}`;
      const tempPath = `${job.workspace_id}/pending/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(tempPath, resumeFile, { upsert: false, contentType: resumeFile.type });

      if (uploadError) {
        console.error("Resume upload error:", uploadError);
        // Non-fatal — continue without resume
      } else {
        resumePath = tempPath;
        resumeFileForParsing = resumeFile;
      }
    }

    // ── AI: Parse resume (PDF only) ─────────────────────────────────────────
    let aiData: AiParsedResume | null = null;
    if (resumeFileForParsing) {
      aiData = await parseResumeWithAI(resumeFileForParsing);
      if (aiData) {
        console.log("Resume parsed successfully via AI");
      } else {
        console.warn("AI parsing skipped or failed — candidate created without enriched profile");
      }
    }

    // ── Upsert candidate ────────────────────────────────────────────────────
    let candidateId: string;
    const isExisting = existingCandidates && existingCandidates.length > 0;

    if (isExisting) {
      candidateId = existingCandidates[0].id;

      // Always update with form data; enrich with AI if we have a fresh parse
      await supabase
        .from("candidates")
        .update({
          first_name: firstName,
          last_name: lastName,
          ...(phone && { phone }),
          ...(linkedinUrl && { linkedin_url: linkedinUrl }),
          ...(aiData && {
            ai_summary: aiData.summary,
            resume_text: aiData.resume_text,
            ai_profile: {
              skills: aiData.skills,
              experience: aiData.experience,
              education: aiData.education,
              certifications: aiData.certifications,
              total_years_experience: aiData.total_years_experience,
              languages: aiData.languages,
              location: aiData.location,
            },
          }),
        })
        .eq("id", candidateId);
    } else {
      const { data: newCandidate, error: candError } = await supabase
        .from("candidates")
        .insert({
          workspace_id: job.workspace_id,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          linkedin_url: linkedinUrl,
          source: "job_board",
          created_by: null,
          ...(aiData && {
            ai_summary: aiData.summary,
            resume_text: aiData.resume_text,
            ai_profile: {
              skills: aiData.skills,
              experience: aiData.experience,
              education: aiData.education,
              certifications: aiData.certifications,
              total_years_experience: aiData.total_years_experience,
              languages: aiData.languages,
              location: aiData.location,
            },
          }),
        })
        .select("id")
        .single();

      if (candError) throw candError;
      candidateId = newCandidate.id;
    }

    // ── Move resume to final path and update candidate ──────────────────────
    if (resumePath) {
      const ext = resumePath.split(".").pop() || "pdf";
      const finalPath = `${job.workspace_id}/${candidateId}/resume_${Date.now()}.${ext}`;

      const { error: moveError } = await supabase.storage
        .from("resumes")
        .move(resumePath, finalPath);

      if (moveError) {
        console.error("Resume move error:", moveError);
        // Keep the temp path as the resume_path if move fails
      } else {
        resumePath = finalPath;
      }

      await supabase
        .from("candidates")
        .update({ resume_path: resumePath })
        .eq("id", candidateId);
    }

    // ── Generate and store vector embedding ─────────────────────────────────
    if (aiData?.summary) {
      const vector = await generateEmbedding(aiData.summary);
      if (vector) {
        await supabase
          .from("candidates")
          .update({ embedding: vector })
          .eq("id", candidateId);
      }
    }

    // ── Get "Applied" pipeline stage ────────────────────────────────────────
    const { data: appliedStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("workspace_id", job.workspace_id)
      .eq("is_terminal", false)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (!appliedStage) {
      return json({ error: "Pipeline not configured for this workspace" }, 500);
    }

    // ── Create application ──────────────────────────────────────────────────
    const { data: application, error: appError } = await supabase
      .from("candidate_applications")
      .insert({
        workspace_id: job.workspace_id,
        candidate_id: candidateId,
        job_id: job.id,
        stage_id: appliedStage.id,
        metadata: {
          source: "job_board",
          ...(coverLetter && { cover_letter: coverLetter }),
          ai_parsed: aiData !== null,
        },
      })
      .select("id")
      .single();

    if (appError) {
      if (appError.code === "23505") {
        return json({ error: "You have already applied for this position" }, 409);
      }
      throw appError;
    }

    // ── Store custom field answers ──────────────────────────────────────────
    if (customAnswersRaw) {
      try {
        const customAnswers: Array<{
          field_key: string;
          field_label: string;
          field_type: string;
          value: string;
        }> = JSON.parse(customAnswersRaw);

        if (customAnswers.length > 0) {
          await supabase.from("application_answers").insert(
            customAnswers.map((a) => ({
              application_id: application.id,
              workspace_id: job.workspace_id,
              field_key: a.field_key,
              field_label: a.field_label,
              field_type: a.field_type,
              value: a.value,
            }))
          );
        }
      } catch (e) {
        console.error("Error parsing custom answers:", e);
      }
    }

    // ── Log activity ────────────────────────────────────────────────────────
    await supabase.from("activities").insert({
      workspace_id: job.workspace_id,
      actor_id: null,
      entity_type: "candidate_applications",
      entity_id: application.id,
      action: "applied",
      metadata: {
        source: "job_board",
        candidate_name: `${firstName} ${lastName}`,
        candidate_email: email,
        job_title: job.title,
        job_id: job.id,
        candidate_id: candidateId,
        ai_parsed: aiData !== null,
      },
    });

    return json({
      success: true,
      application_id: application.id,
      message: "Application submitted successfully",
      ai_parsed: aiData !== null,
    }, 201);
  } catch (error) {
    console.error("submit-application error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

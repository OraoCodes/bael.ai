import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOrGetLabel } from "../_shared/gmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://app.bael.ai";

serve(async (req) => {
  // This endpoint is called by Google's OAuth redirect — always GET
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
    return Response.redirect(`${SITE_URL}?gmail_error=${encodeURIComponent(error)}`, 302);
  }

  if (!code || !stateParam) {
    return Response.redirect(`${SITE_URL}?gmail_error=missing_params`, 302);
  }

  let state: { user_id: string; workspace_id: string; redirect_url: string };
  try {
    state = JSON.parse(atob(stateParam));
  } catch {
    return Response.redirect(`${SITE_URL}?gmail_error=invalid_state`, 302);
  }

  const redirectUrl = state.redirect_url || SITE_URL;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;

    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Google token exchange failed:", body);
      return Response.redirect(`${redirectUrl}?gmail_error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in;

    if (!refreshToken) {
      console.error("No refresh_token returned — user may need to re-consent");
      return Response.redirect(`${redirectUrl}?gmail_error=no_refresh_token`, 302);
    }

    // 2. Fetch user email
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error("Google profile fetch failed:", await profileRes.text());
      return Response.redirect(`${redirectUrl}?gmail_error=profile_fetch_failed`, 302);
    }

    const profile = await profileRes.json();
    const gmailAddress: string = profile.email;

    // 3. Create "bael-processed" label in Gmail
    let labelId: string | null = null;
    try {
      labelId = await createOrGetLabel(accessToken);
    } catch (err) {
      console.error("Failed to create Gmail label:", err);
      // Non-fatal: we can still sync, just won't label processed messages
    }

    // 4. Upsert gmail_links
    const now = new Date().toISOString();
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("gmail_links")
      .upsert(
        {
          user_id: state.user_id,
          workspace_id: state.workspace_id,
          gmail_address: gmailAddress,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          label_id: labelId,
          sync_enabled: true,
          last_error: null,
          linked_at: now,
          unlinked_at: null,
          updated_at: now,
        },
        { onConflict: "user_id,workspace_id" }
      );

    if (upsertError) {
      console.error("Gmail link upsert error:", upsertError);
      return Response.redirect(`${redirectUrl}?gmail_error=save_failed`, 302);
    }

    return Response.redirect(`${redirectUrl}?gmail=connected`, 302);
  } catch (err) {
    console.error("gmail-oauth-callback error:", err);
    return Response.redirect(`${redirectUrl}?gmail_error=internal_error`, 302);
  }
});

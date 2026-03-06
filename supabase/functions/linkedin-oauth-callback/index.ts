import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID")!;
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://app.bael.ai";

serve(async (req) => {
  // This endpoint is called by LinkedIn's OAuth redirect — always GET
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("LinkedIn OAuth error:", error, url.searchParams.get("error_description"));
    return Response.redirect(`${SITE_URL}?linkedin_error=${encodeURIComponent(error)}`, 302);
  }

  if (!code || !stateParam) {
    return Response.redirect(`${SITE_URL}?linkedin_error=missing_params`, 302);
  }

  let state: { user_id: string; workspace_id: string; redirect_url: string };
  try {
    state = JSON.parse(atob(stateParam));
  } catch {
    return Response.redirect(`${SITE_URL}?linkedin_error=invalid_state`, 302);
  }

  const redirectUrl = state.redirect_url || `${SITE_URL}`;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build the same redirect_uri that was used in the authorization request
    const redirectUri = `${SUPABASE_URL}/functions/v1/linkedin-oauth-callback`;

    // 1. Exchange authorization code for access token
    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("LinkedIn token exchange failed:", body);
      return Response.redirect(
        `${redirectUrl}?linkedin_error=token_exchange_failed`,
        302
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const expiresIn: number = tokenData.expires_in; // seconds
    const refreshToken: string | undefined = tokenData.refresh_token;

    // 2. Fetch user profile
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error("LinkedIn profile fetch failed:", await profileRes.text());
      return Response.redirect(
        `${redirectUrl}?linkedin_error=profile_fetch_failed`,
        302
      );
    }

    const profile = await profileRes.json();
    const linkedinProfileId = `urn:li:person:${profile.sub}`;
    const linkedinName = profile.name || profile.given_name || null;

    // 3. Upsert linkedin_links
    const now = new Date().toISOString();
    const tokenExpiresAt = new Date(
      Date.now() + expiresIn * 1000
    ).toISOString();

    const { error: upsertError } = await supabase
      .from("linkedin_links")
      .upsert(
        {
          user_id: state.user_id,
          workspace_id: state.workspace_id,
          linkedin_profile_id: linkedinProfileId,
          linkedin_name: linkedinName,
          access_token: accessToken,
          refresh_token: refreshToken ?? null,
          token_expires_at: tokenExpiresAt,
          linked_at: now,
          unlinked_at: null,
          updated_at: now,
        },
        { onConflict: "user_id,workspace_id" }
      );

    if (upsertError) {
      console.error("LinkedIn link upsert error:", upsertError);
      return Response.redirect(
        `${redirectUrl}?linkedin_error=save_failed`,
        302
      );
    }

    // Redirect back to settings with success
    return Response.redirect(`${redirectUrl}?linkedin=connected`, 302);
  } catch (err) {
    console.error("linkedin-oauth-callback error:", err);
    return Response.redirect(
      `${redirectUrl}?linkedin_error=internal_error`,
      302
    );
  }
});

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, plan_id } = await req.json();
    if (!workspace_id || !plan_id) {
      return new Response(JSON.stringify({ error: "workspace_id and plan_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner/admin of this workspace
    const { data: membership } = await supabaseAdmin
      .from("workspace_memberships")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan with Stripe price ID
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (!plan || !plan.stripe_price_id) {
      return new Response(JSON.stringify({ error: "Invalid plan or Stripe price not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create Stripe customer
    const { data: sub } = await supabaseAdmin
      .from("workspace_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("workspace_id", workspace_id)
      .single();

    let stripeCustomerId = sub?.stripe_customer_id || "";

    if (!stripeCustomerId) {
      const { data: workspace } = await supabaseAdmin
        .from("workspaces")
        .select("name")
        .eq("id", workspace_id)
        .single();

      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace?.name,
        metadata: { workspace_id, user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Save customer ID immediately
      await supabaseAdmin
        .from("workspace_subscriptions")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("workspace_id", workspace_id);
    }

    // Get workspace slug for redirect
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("slug")
      .eq("id", workspace_id)
      .single();

    const successUrl = `${SITE_URL}/w/${ws?.slug}/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${SITE_URL}/w/${ws?.slug}/settings?tab=billing`;

    // If upgrading an existing subscription, use Stripe's subscription update
    if (sub?.stripe_subscription_id) {
      const existingSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const itemId = existingSub.items.data[0]?.id;

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: itemId, price: plan.stripe_price_id }],
        proration_behavior: "create_prorations",
        metadata: { workspace_id },
      });

      // Log the plan change
      await supabaseAdmin.from("billing_events").insert({
        workspace_id,
        event_type: "plan_change_initiated",
        metadata: { new_plan_id: plan_id },
      });

      return new Response(JSON.stringify({ upgraded: true, redirect_url: cancelUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // New subscription — create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { workspace_id, plan_id },
      subscription_data: { metadata: { workspace_id } },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

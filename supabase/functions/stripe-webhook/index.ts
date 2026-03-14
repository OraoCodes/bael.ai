import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function logBillingEvent(workspaceId: string, eventType: string, stripeEventId: string, metadata: Record<string, unknown>) {
  await supabaseAdmin.from("billing_events").insert({
    workspace_id: workspaceId,
    event_type: eventType,
    stripe_event_id: stripeEventId,
    metadata,
  }).throwOnError();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .single();

  if (existing) {
    return new Response("Already processed", { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        if (!workspaceId) break;

        const stripeSubId = session.subscription as string;
        const stripeCustomerId = session.customer as string;

        // Fetch subscription from Stripe to get period dates + plan
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const priceId = stripeSub.items.data[0]?.price.id;

        // Resolve plan_id from price
        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("id")
          .eq("stripe_price_id", priceId)
          .single();

        await supabaseAdmin
          .from("workspace_subscriptions")
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubId,
            plan_id: plan?.id ?? "starter",
            status: "active",
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", workspaceId);

        await logBillingEvent(workspaceId, "subscription_activated", event.id, {
          stripe_subscription_id: stripeSubId,
          plan_id: plan?.id,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = invoice.subscription as string;
        if (!stripeSubId) break;

        const { data: sub } = await supabaseAdmin
          .from("workspace_subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", stripeSubId)
          .single();

        if (!sub) break;

        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        await supabaseAdmin
          .from("workspace_subscriptions")
          .update({
            status: "active",
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            grace_period_ends_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", sub.workspace_id);

        await logBillingEvent(sub.workspace_id, "payment_succeeded", event.id, {
          amount_paid: invoice.amount_paid,
          invoice_id: invoice.id,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = invoice.subscription as string;
        if (!stripeSubId) break;

        const { data: sub } = await supabaseAdmin
          .from("workspace_subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", stripeSubId)
          .single();

        if (!sub) break;

        await supabaseAdmin
          .from("workspace_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("workspace_id", sub.workspace_id);

        await logBillingEvent(sub.workspace_id, "payment_failed", event.id, {
          invoice_id: invoice.id,
          attempt_count: invoice.attempt_count,
        });
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const { data: sub } = await supabaseAdmin
          .from("workspace_subscriptions")
          .select("workspace_id, plan_id")
          .eq("stripe_subscription_id", stripeSub.id)
          .single();

        if (!sub) break;

        const priceId = stripeSub.items.data[0]?.price.id;
        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("id")
          .eq("stripe_price_id", priceId)
          .single();

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          paused: "paused",
          trialing: "trialing",
        };

        await supabaseAdmin
          .from("workspace_subscriptions")
          .update({
            plan_id: plan?.id ?? sub.plan_id,
            status: statusMap[stripeSub.status] ?? "active",
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", sub.workspace_id);

        await logBillingEvent(sub.workspace_id, "subscription_updated", event.id, {
          old_plan: sub.plan_id,
          new_plan: plan?.id,
          status: stripeSub.status,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const { data: sub } = await supabaseAdmin
          .from("workspace_subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", stripeSub.id)
          .single();

        if (!sub) break;

        const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("workspace_subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
            grace_period_ends_at: gracePeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", sub.workspace_id);

        await logBillingEvent(sub.workspace_id, "subscription_canceled", event.id, {
          grace_period_ends_at: gracePeriodEnd,
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

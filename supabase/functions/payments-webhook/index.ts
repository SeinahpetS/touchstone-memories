import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, getWebhookSecret } from "../_shared/stripe.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function findUserId(
  stripe: ReturnType<typeof createStripeClient>,
  customerId: string,
  fallback?: string,
): Promise<string | null> {
  if (fallback) return fallback;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !("deleted" in customer && customer.deleted)) {
      const userId = (customer as { metadata?: Record<string, string> }).metadata?.userId;
      if (userId) return userId;
    }
  } catch (_) {
    /* ignore */
  }
  // Fallback: look up by stored customer id
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function applySubscription(
  stripe: ReturnType<typeof createStripeClient>,
  env: StripeEnv,
  subscription: Record<string, unknown>,
) {
  const customerId = subscription.customer as string;
  const userId = await findUserId(
    stripe,
    customerId,
    ((subscription.metadata as Record<string, string>) || {}).userId,
  );
  if (!userId) {
    console.warn("payments-webhook: no userId resolvable for customer", customerId);
    return;
  }

  const status = subscription.status as string;
  const items = (subscription.items as { data: Array<Record<string, unknown>> }).data;
  const firstItem = items?.[0];
  const stripePrice = firstItem?.price as { id: string; lookup_key?: string } | undefined;

  // Resolve human-readable price id (lookup_key)
  let priceId: string | null = stripePrice?.lookup_key ?? null;
  if (!priceId && stripePrice?.id) {
    try {
      const fetched = await stripe.prices.retrieve(stripePrice.id);
      priceId = fetched.lookup_key ?? null;
    } catch (_) { /* ignore */ }
  }

  const periodEndRaw =
    (firstItem?.current_period_end as number | undefined) ??
    (subscription.current_period_end as number | undefined);
  const currentPeriodEnd = periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null;

  const isActiveLike = ["active", "trialing", "past_due"].includes(status);

  const update: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id as string,
    subscription_status: status,
    subscription_price_id: priceId,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    stripe_env: env,
  };

  if (isActiveLike) {
    // Set vivid_since only the first time we see an active state
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("vivid_since")
      .eq("id", userId)
      .maybeSingle();
    if (!existing?.vivid_since) {
      update.vivid_since = new Date().toISOString();
    }
  }

  await supabaseAdmin.from("profiles").update(update).eq("id", userId);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const envParam = url.searchParams.get("env");
  const env: StripeEnv = envParam === "live" ? "live" : "sandbox";

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await req.text();
  const stripe = createStripeClient(env);

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      getWebhookSecret(env),
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Record<string, unknown>;
        const subscriptionId = session.subscription as string | undefined;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await applySubscription(stripe, env, sub as unknown as Record<string, unknown>);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "subscription.created":
      case "subscription.updated": {
        await applySubscription(
          stripe,
          env,
          event.data.object as unknown as Record<string, unknown>,
        );
        break;
      }
      case "customer.subscription.deleted":
      case "subscription.canceled": {
        const sub = event.data.object as Record<string, unknown>;
        const customerId = sub.customer as string;
        const userId = await findUserId(
          stripe,
          customerId,
          ((sub.metadata as Record<string, string>) || {}).userId,
        );
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "canceled",
              cancel_at_period_end: false,
              stripe_subscription_id: null,
            })
            .eq("id", userId);
        }
        break;
      }
      default:
        // ignore other events
        break;
    }
  } catch (err) {
    console.error("payments-webhook handler error", event.type, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

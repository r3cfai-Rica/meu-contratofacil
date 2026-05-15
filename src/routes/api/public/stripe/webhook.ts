import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { planFromProductId, type PlanTier } from "@/lib/plans";

type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

async function resolveUserId(
  customerId: string,
  email: string | null | undefined,
): Promise<string | null> {
  // Primary: lookup by stripe_customer_id
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (data?.user_id) return data.user_id;

  // Fallback: lookup by email in auth.users
  if (!email) return null;
  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  const user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user?.id ?? null;
}

async function upsertFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let email: string | null = null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) email = customer.email;
  } catch (e) {
    console.error("[stripe-webhook] failed to retrieve customer", e);
  }

  const userId = await resolveUserId(customerId, email);
  if (!userId) {
    console.warn("[stripe-webhook] no user matched", { customerId, email });
    return;
  }

  const item = subscription.items.data[0];
  const productId =
    typeof item?.price.product === "string"
      ? item.price.product
      : item?.price.product?.id;

  const isCanceled = subscription.status === "canceled";
  const plan: PlanTier = isCanceled ? "free" : planFromProductId(productId);

  const sub = subscription as unknown as { current_period_end?: number };
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status: subscription.status as SubStatus,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: item?.price.id ?? null,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[stripe-webhook] upsert error", error);
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const liveKey = process.env.STRIPE_SECRET_KEY;
        const testKey = process.env.STRIPE_SECRET_KEY_TEST;
        const liveWhSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const testWhSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST;
        if (!liveKey && !testKey) {
          console.error("[stripe-webhook] missing STRIPE_SECRET_KEY(_TEST)");
          return new Response("Webhook not configured", { status: 500 });
        }
        if (!liveWhSecret && !testWhSecret) {
          console.error("[stripe-webhook] missing STRIPE_WEBHOOK_SECRET(_TEST)");
          return new Response("Webhook not configured", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 401 });

        const body = await request.text();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiVersion = "2025-08-27.basil" as any;
        const liveStripe = liveKey ? new Stripe(liveKey, { apiVersion }) : null;
        const testStripe = testKey ? new Stripe(testKey, { apiVersion }) : null;

        // Try live secret first, then test. Whichever verifies determines which Stripe client we use.
        let event: Stripe.Event | null = null;
        let stripe: Stripe | null = null;
        const candidates: Array<{ secret: string; client: Stripe | null; mode: string }> = [];
        if (liveWhSecret && liveStripe) candidates.push({ secret: liveWhSecret, client: liveStripe, mode: "live" });
        if (testWhSecret && testStripe) candidates.push({ secret: testWhSecret, client: testStripe, mode: "test" });

        let lastErr: unknown = null;
        for (const c of candidates) {
          try {
            event = await c.client!.webhooks.constructEventAsync(body, signature, c.secret);
            stripe = c.client;
            console.log("[stripe-webhook] verified", { mode: c.mode });
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (!event || !stripe) {
          console.error("[stripe-webhook] signature verification failed", lastErr);
          return new Response("Invalid signature", { status: 401 });
        }

        console.log("[stripe-webhook] received", { id: event.id, type: event.type });

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              const subId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id;
              if (subId) {
                const subscription = await stripe.subscriptions.retrieve(subId);
                await upsertFromSubscription(stripe, subscription);
                break;
              }

              // One-off invoice payment (USD via Stripe Checkout)
              const invoiceId = session.metadata?.invoice_id;
              if (invoiceId) {
                const paymentIntentId =
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : session.payment_intent?.id ?? null;

                const { error: updErr } = await supabaseAdmin
                  .from("invoices")
                  .update({
                    status: "paid",
                    paid_at: new Date().toISOString(),
                    stripe_payment_intent_id: paymentIntentId,
                  })
                  .eq("id", invoiceId);
                if (updErr) console.error("[stripe-webhook] invoice update error", updErr);

                await supabaseAdmin.from("payment_logs").insert({
                  invoice_id: invoiceId,
                  user_id: session.metadata?.user_id ?? null,
                  provider: "stripe",
                  event_type: "checkout.session.completed",
                  amount_cents: session.amount_total ?? null,
                  currency: (session.currency ?? "usd").toUpperCase(),
                  raw: { session_id: session.id, payment_intent: paymentIntentId },
                });
              }
              break;
            }
            case "payment_intent.payment_failed": {
              const pi = event.data.object as Stripe.PaymentIntent;
              const invoiceId = pi.metadata?.invoice_id;
              if (invoiceId) {
                await supabaseAdmin.from("payment_logs").insert({
                  invoice_id: invoiceId,
                  user_id: pi.metadata?.user_id ?? null,
                  provider: "stripe",
                  event_type: "payment_intent.payment_failed",
                  amount_cents: pi.amount ?? null,
                  currency: (pi.currency ?? "usd").toUpperCase(),
                  raw: {
                    payment_intent: pi.id,
                    last_payment_error: pi.last_payment_error?.message ?? null,
                  },
                });
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const subscription = event.data.object as Stripe.Subscription;
              await upsertFromSubscription(stripe, subscription);
              break;
            }
            case "invoice.payment_succeeded": {
              const invoice = event.data.object as Stripe.Invoice;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const subId = (invoice as any).subscription;
              const subscriptionId =
                typeof subId === "string" ? subId : subId?.id;
              if (subscriptionId) {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                await upsertFromSubscription(stripe, subscription);
              }
              break;
            }
            case "invoice.payment_failed": {
              const invoice = event.data.object as Stripe.Invoice;
              const customerId =
                typeof invoice.customer === "string"
                  ? invoice.customer
                  : invoice.customer?.id;
              if (customerId) {
                const userId = await resolveUserId(customerId, invoice.customer_email);
                if (userId) {
                  await supabaseAdmin
                    .from("subscriptions")
                    .update({ status: "past_due" })
                    .eq("user_id", userId);
                }
              }
              break;
            }
            default:
              console.log("[stripe-webhook] ignored event type", event.type);
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          // Return 200 anyway so Stripe doesn't keep retrying on logic bugs.
          // Errors are logged for debugging.
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

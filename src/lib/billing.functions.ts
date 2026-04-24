import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, planFromProductId, type PlanTier } from "./plans";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as Stripe.StripeConfig["apiVersion"] });
}

function getOrigin(): string {
  return (
    getRequestHeader("origin") ??
    getRequestHeader("referer")?.replace(/\/[^/]*$/, "") ??
    "http://localhost:3000"
  );
}

async function findOrCreateCustomerByEmail(stripe: Stripe, email: string, name?: string) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0];
  return stripe.customers.create({ email, name });
}

/**
 * Sync the user's subscription state from Stripe into our DB and return current plan.
 * Called on login, page load, and after checkout.
 */
export const checkSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) {
      return { plan: "free" as PlanTier, status: "active", current_period_end: null, cancel_at_period_end: false };
    }

    const stripe = getStripe();
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      // Ensure a free row exists
      await supabaseAdmin
        .from("subscriptions")
        .upsert(
          { user_id: userId, plan: "free", status: "active" },
          { onConflict: "user_id" },
        );
      return { plan: "free" as PlanTier, status: "active", current_period_end: null, cancel_at_period_end: false };
    }

    const customer = customers.data[0];

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
    });

    const active = subs.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status),
    );

    let plan: PlanTier = "free";
    let status: string = "active";
    let currentPeriodEnd: string | null = null;
    let cancelAtPeriodEnd = false;
    let stripeSubscriptionId: string | null = null;
    let stripePriceId: string | null = null;

    if (active) {
      const item = active.items.data[0];
      const productId =
        typeof item.price.product === "string" ? item.price.product : item.price.product?.id;
      plan = planFromProductId(productId);
      status = active.status;
      // Stripe types: current_period_end may be on subscription items or root depending on version
      const sub = active as unknown as { current_period_end?: number };
      currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      cancelAtPeriodEnd = active.cancel_at_period_end ?? false;
      stripeSubscriptionId = active.id;
      stripePriceId = item.price.id;
    }

    await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan,
          status: status as
            | "active"
            | "trialing"
            | "past_due"
            | "canceled"
            | "incomplete",
          stripe_customer_id: customer.id,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_price_id: stripePriceId,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
        },
        { onConflict: "user_id" },
      );

    return {
      plan,
      status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    };
  });

/** Create a Stripe Checkout Session for a subscription upgrade. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: "pro" | "business" }) => {
    if (input.plan !== "pro" && input.plan !== "business") {
      throw new Error("Plano inválido");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) throw new Error("Email não disponível");

    const planInfo = PLANS[data.plan];
    if (!planInfo.stripePriceId) throw new Error("Plano não configurado");

    const stripe = getStripe();
    const customer = await findOrCreateCustomerByEmail(stripe, email);

    const origin = getOrigin();
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [{ price: planInfo.stripePriceId, quantity: 1 }],
      success_url: `${origin}/configuracoes?checkout=success`,
      cancel_url: `${origin}/planos?checkout=canceled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { user_id: userId, plan: data.plan },
      },
      metadata: { user_id: userId, plan: data.plan },
    });

    return { url: session.url };
  });

/** Create a Stripe Billing Portal session so the user can manage their subscription. */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) throw new Error("Email não disponível");

    const stripe = getStripe();
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("Nenhuma assinatura encontrada para gerenciar");
    }

    const origin = getOrigin();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/configuracoes`,
    });

    return { url: portal.url };
  });

/** List the user's invoices from Stripe. */
export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) return { invoices: [] };

    const stripe = getStripe();
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) return { invoices: [] };

    const invoices = await stripe.invoices.list({
      customer: customers.data[0].id,
      limit: 24,
    });

    return {
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount_paid: inv.amount_paid,
        amount_due: inv.amount_due,
        currency: inv.currency,
        status: inv.status,
        created: inv.created,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
      })),
    };
  });

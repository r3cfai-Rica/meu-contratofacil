import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withSupabaseAccessToken } from "@/integrations/supabase/server-fn-auth";
import { getLaunchOfferPriceId } from "./plans";
import { requireCurrentStripe } from "./stripe-env.server";

function getOrigin(): string {
  return (
    getRequestHeader("origin") ??
    getRequestHeader("referer")?.replace(/\/[^/]*$/, "") ??
    "http://localhost:3000"
  );
}

/**
 * Create a Stripe Checkout Session for the one-time launch offer.
 * Accepts both card and PIX (BRL).
 */
export const createLaunchOfferCheckout = createServerFn({ method: "POST" })
  .middleware([withSupabaseAccessToken, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) throw new Error("Email não disponível");

    const { stripe, mode } = requireCurrentStripe();
    const priceId = getLaunchOfferPriceId(mode);

    // Reuse customer if exists
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ?? (await stripe.customers.create({ email }));

    const origin = getOrigin();
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "payment",
      payment_method_types: ["card", "pix"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/configuracoes?launch=success`,
      cancel_url: `${origin}/?launch=canceled`,
      allow_promotion_codes: true,
      metadata: {
        user_id: userId,
        type: "launch_offer",
      },
      payment_intent_data: {
        metadata: {
          user_id: userId,
          type: "launch_offer",
        },
      },
    });

    return { url: session.url };
  });

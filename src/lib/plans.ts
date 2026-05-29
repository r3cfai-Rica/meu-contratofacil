export type PlanTier = "free" | "pro" | "business";

export interface PlanLimits {
  maxClients: number | null; // null = unlimited
  maxActiveContracts: number | null;
  maxInvoicesPerMonth: number | null;
  maxTeamMembers: number; // 0 = no team feature
  customLogo: boolean;
  reminders: boolean;
  multiUser: boolean;
  advancedReports: boolean;
  prioritySupport: boolean;
}

export interface PlanInfo {
  id: PlanTier;
  name: string;
  monthlyPriceBRL: number;
  tagline: string;
  features: string[];
  limits: PlanLimits;
  /** Stripe price id (live mode) */
  stripePriceId?: string;
  stripeProductId?: string;
  /** Stripe price id (test mode) */
  stripePriceIdTest?: string;
  stripeProductIdTest?: string;
  highlighted?: boolean;
}

export type StripeMode = "test" | "live";

export function getPlanPriceId(tier: PlanTier, mode: StripeMode): string | undefined {
  const p = PLANS[tier];
  if (mode === "test") return p.stripePriceIdTest ?? p.stripePriceId;
  return p.stripePriceId;
}

export const PLANS: Record<PlanTier, PlanInfo> = {
  free: {
    id: "free",
    name: "Grátis",
    monthlyPriceBRL: 0,
    tagline: "Comece sem custos para validar sua operação",
    features: [
      "Até 3 clientes",
      "Até 3 contratos ativos",
      "Até 3 cobranças por mês",
      "Sem personalização de marca",
    ],
    limits: {
      maxClients: 3,
      maxActiveContracts: 3,
      maxInvoicesPerMonth: 3,
      maxTeamMembers: 0,
      customLogo: false,
      reminders: false,
      multiUser: false,
      advancedReports: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPriceBRL: 49,
    tagline: "Para profissionais que querem crescer sem limites",
    features: [
      "Clientes ilimitados",
      "Contratos ilimitados",
      "Cobranças ilimitadas",
      "Logo próprio nos contratos",
      "Lembretes automáticos de vencimento",
    ],
    limits: {
      maxClients: null,
      maxActiveContracts: null,
      maxInvoicesPerMonth: null,
      maxTeamMembers: 0,
      customLogo: true,
      reminders: true,
      multiUser: false,
      advancedReports: false,
      prioritySupport: false,
    },
    stripePriceId: "price_1TPYsMF7QCShwtsLy0PMiSHN",
    stripeProductId: "prod_UOLZjAnu1GPRdR",
    stripePriceIdTest: "price_1TVLcyF7QCShwtsL7KYJMuPs",
    stripeProductIdTest: "prod_UUKHwPEsSR26Lz",
    highlighted: true,
  },
  business: {
    id: "business",
    name: "Business",
    monthlyPriceBRL: 99,
    tagline: "Para times com necessidades avançadas",
    features: [
      "Tudo do Pro",
      "Múltiplos usuários (até 3)",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    limits: {
      maxClients: null,
      maxActiveContracts: null,
      maxInvoicesPerMonth: null,
      maxTeamMembers: 3,
      customLogo: true,
      reminders: true,
      multiUser: true,
      advancedReports: true,
      prioritySupport: true,
    },
    stripePriceId: "price_1TUrBLB2CRIHoDBfKFFqEEaU",
    stripeProductId: "prod_UTooQU8Z6Mq2lI",
    stripePriceIdTest: "price_1TVLdzF7QCShwtsLLQeFy3x2",
    stripeProductIdTest: "prod_UUKIn9vNXfG14L",
  },
};

export const PLAN_ORDER: PlanTier[] = ["free", "pro", "business"];

/** Launch offer: one-time payment that unlocks the Pro plan. */
export const LAUNCH_OFFER = {
  amountBRL: 48.9,
  regularPriceBRL: 68.9,
  unitAmountCents: 4890,
  stripeProductId: "prod_UacbBdtqaZtybk",
  stripePriceId: "price_1TbRMRB2CRIHoDBfbhnIxLmJ",
  stripeProductIdTest: "prod_UacbaLo8KXjDjL",
  stripePriceIdTest: "price_1TbRMdF7QCShwtsLLbT3YUsz",
} as const;

export function getLaunchOfferPriceId(mode: StripeMode): string {
  return mode === "test" ? LAUNCH_OFFER.stripePriceIdTest : LAUNCH_OFFER.stripePriceId;
}

/** Map a Stripe product id to a plan tier (used by check-subscription). Matches both live and test product IDs. */
export function planFromProductId(productId: string | null | undefined): PlanTier {
  if (!productId) return "free";
  if (
    productId === LAUNCH_OFFER.stripeProductId ||
    productId === LAUNCH_OFFER.stripeProductIdTest
  )
    return "pro";
  for (const tier of PLAN_ORDER) {
    const p = PLANS[tier];
    if (p.stripeProductId === productId || p.stripeProductIdTest === productId) return tier;
  }
  return "free";
}

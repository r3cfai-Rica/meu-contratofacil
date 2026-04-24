export type PlanTier = "free" | "pro" | "business";

export interface PlanLimits {
  maxClients: number | null; // null = unlimited
  maxActiveContracts: number | null;
  maxInvoicesPerMonth: number | null;
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
  /** Stripe price id (for paid plans) */
  stripePriceId?: string;
  stripeProductId?: string;
  highlighted?: boolean;
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
      customLogo: true,
      reminders: true,
      multiUser: false,
      advancedReports: false,
      prioritySupport: false,
    },
    stripePriceId: "price_1TPYsMF7QCShwtsLy0PMiSHN",
    stripeProductId: "prod_UOLZjAnu1GPRdR",
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
      customLogo: true,
      reminders: true,
      multiUser: true,
      advancedReports: true,
      prioritySupport: true,
    },
    stripePriceId: "price_1TPYtWF7QCShwtsL1dyMB4YN",
    stripeProductId: "prod_UOLaD60vDtYEWI",
  },
};

export const PLAN_ORDER: PlanTier[] = ["free", "pro", "business"];

/** Map a Stripe product id to a plan tier (used by check-subscription). */
export function planFromProductId(productId: string | null | undefined): PlanTier {
  if (!productId) return "free";
  for (const tier of PLAN_ORDER) {
    if (PLANS[tier].stripeProductId === productId) return tier;
  }
  return "free";
}

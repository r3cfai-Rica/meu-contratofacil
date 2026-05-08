import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/use-plan";
import { PLANS, PLAN_ORDER, type PlanTier } from "@/lib/plans";
import { createCheckoutSession, changePlan } from "@/lib/billing.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — ContratoFácil" },
      {
        name: "description",
        content:
          "Escolha o plano ideal para o seu negócio. Comece grátis ou faça upgrade para o Pro com clientes, contratos e cobranças ilimitados.",
      },
    ],
  }),
  component: PlansRoute,
});

function PlansRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  // Show plans page even without auth, but inside layout if logged in
  return user ? (
    <AppLayout>
      <PlansPage />
    </AppLayout>
  ) : (
    <PublicPlans />
  );
}

function PublicPlans() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
        <PlansHero />
        <PlansGrid currentPlan="free" />
      </div>
    </div>
  );
}

function PlansPage() {
  const navigate = useNavigate();
  const { plan, refresh } = usePlan();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "canceled") {
      toast.info("Checkout cancelado");
      void navigate({ to: "/planos", replace: true });
    }
    void refresh();
  }, [navigate, refresh]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PlansHero />
      <PlansGrid currentPlan={plan} />
    </div>
  );
}

function PlansHero() {
  return (
    <div className="mb-10 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3 w-3" /> Planos & Preços
      </div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Escolha o plano ideal para o seu negócio
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
        Comece grátis e faça upgrade quando precisar. Sem fidelidade — cancele a qualquer
        momento direto pelo Stripe.
      </p>
    </div>
  );
}

function PlansGrid({ currentPlan }: { currentPlan: PlanTier }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const checkoutFn = useServerFn(createCheckoutSession);
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);

  const handleSubscribe = async (target: PlanTier) => {
    if (!user) {
      void navigate({ to: "/signup" });
      return;
    }
    if (target === "free" || target === currentPlan) return;
    setLoadingPlan(target);
    try {
      const result = await checkoutFn({ data: { plan: target as "pro" | "business" } });
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error("Não foi possível iniciar o checkout");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao iniciar checkout";
      toast.error(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLAN_ORDER.map((tier) => {
        const p = PLANS[tier];
        const isCurrent = currentPlan === tier;
        const isHighlighted = !!p.highlighted;
        const isLoading = loadingPlan === tier;

        return (
          <div
            key={tier}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6 transition",
              isHighlighted
                ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/30"
                : "border-border/70",
            )}
          >
            {isHighlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                Mais popular
              </div>
            )}
            {isCurrent && (
              <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                Plano atual
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  R${p.monthlyPriceBRL}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            </div>

            <ul className="mb-6 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {tier === "free" ? (
              <Button
                variant="outline"
                disabled={isCurrent}
                className="w-full"
                onClick={() => !user && void navigate({ to: "/signup" })}
              >
                {isCurrent ? "Plano atual" : "Começar grátis"}
              </Button>
            ) : (
              <Button
                disabled={isCurrent || isLoading}
                className={cn(
                  "w-full gap-2",
                  isHighlighted && "bg-primary hover:bg-primary/90",
                )}
                onClick={() => void handleSubscribe(tier)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrent ? null : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isCurrent ? "Plano atual" : `Assinar ${p.name}`}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

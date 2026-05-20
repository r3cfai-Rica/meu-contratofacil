import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";
import { checkSubscription } from "@/lib/billing.functions";
import { PLANS, type PlanInfo, type PlanTier } from "@/lib/plans";

interface UsePlanState {
  plan: PlanTier;
  planInfo: PlanInfo;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePlan(): UsePlanState {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const checkSubscriptionFn = useServerFn(checkSubscription);
  const [plan, setPlan] = useState<PlanTier>("free");
  const [status, setStatus] = useState<string>("active");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFromDb = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPlan(data.plan as PlanTier);
      setStatus(data.status);
      setCurrentPeriodEnd(data.current_period_end);
      setCancelAtPeriodEnd(data.cancel_at_period_end);
    }
  }, [user]);

  const resetToFree = useCallback(() => {
    setPlan("free");
    setStatus("active");
    setCurrentPeriodEnd(null);
    setCancelAtPeriodEnd(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await checkSubscriptionFn();
      setPlan(result.plan);
      setStatus(result.status);
      setCurrentPeriodEnd(result.current_period_end);
      setCancelAtPeriodEnd(result.cancel_at_period_end);
    } catch (error) {
      if (error instanceof Response && error.status === 401) {
        await loadFromDb();
        return;
      }

      try {
        await loadFromDb();
      } catch {
        resetToFree();
      }
    } finally {
      setLoading(false);
    }
  }, [user, checkSubscriptionFn, loadFromDb, resetToFree]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      resetToFree();
      setLoading(false);
      return;
    }
    void (async () => {
      await loadFromDb(); // fast first paint
      void refresh(); // then sync with Stripe
    })();
  }, [user, authLoading, loadFromDb, refresh, resetToFree]);

  const planInfo = useMemo<PlanInfo>(() => {
    if (isAdmin) {
      return {
        ...PLANS.business,
        limits: {
          maxClients: null,
          maxActiveContracts: null,
          maxInvoicesPerMonth: null,
          maxTeamMembers: Number.MAX_SAFE_INTEGER,
          customLogo: true,
          reminders: true,
          multiUser: true,
          advancedReports: true,
          prioritySupport: true,
        },
      };
    }

    return PLANS[plan] ?? PLANS.free;
  }, [isAdmin, plan]);

  return {
    plan,
    planInfo,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    loading: loading || adminLoading,
    refresh,
  };
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AdminAccess {
  isAdmin: boolean;
  isViewer: boolean;
  canView: boolean;
  canWrite: boolean;
  loading: boolean;
}

export function useIsAdmin(): AdminAccess {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<Omit<AdminAccess, "loading">>({
    isAdmin: false,
    isViewer: false,
    canView: false,
    canWrite: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ isAdmin: false, isViewer: false, canView: false, canWrite: false });
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "viewer"])
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r) => (r as { role: string }).role);
        const isAdmin = roles.includes("admin");
        const isViewer = roles.includes("viewer");
        setState({
          isAdmin,
          isViewer,
          canView: isAdmin || isViewer,
          canWrite: isAdmin,
        });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { ...state, loading };
}

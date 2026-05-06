import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const withSupabaseAccessToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authHeaders = new Headers();

    if (session?.access_token) {
      authHeaders.set("authorization", `Bearer ${session.access_token}`);
    }

    return next({ headers: authHeaders });
  },
);
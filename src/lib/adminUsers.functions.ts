import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Acesso negado: apenas administradores");

    if (data.userId === userId) {
      throw new Error("Você não pode excluir sua própria conta.");
    }

    const { error: cascadeErr } = await supabase.rpc(
      "admin_delete_user_cascade",
      { _user_id: data.userId },
    );
    if (cascadeErr) throw new Error(cascadeErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(
      data.userId,
    );
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });

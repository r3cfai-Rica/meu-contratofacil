import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, type PlanTier } from "./plans";

/** Invite a teammate by email. Limited by plan (Business: 3). */
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("E-mail inválido");
    }
    if (email.length > 254) throw new Error("E-mail muito longo");
    return { email };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Check plan
    const { data: planRow } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();
    const plan: PlanTier =
      planRow && ["active", "trialing"].includes(planRow.status)
        ? (planRow.plan as PlanTier)
        : "free";
    const limit = PLANS[plan].limits.maxTeamMembers;
    if (limit <= 0) {
      throw new Error("Convidar membros está disponível apenas no plano Business");
    }

    // Count existing pending+accepted
    const { count } = await supabaseAdmin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .in("status", ["pending", "accepted"]);
    if ((count ?? 0) >= limit) {
      throw new Error(`Você atingiu o limite de ${limit} membros do plano Business`);
    }

    // Try to find existing user by email (so accept can be 1-click)
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const member = existing?.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email,
    );

    const { data: invite, error } = await supabaseAdmin
      .from("team_members")
      .upsert(
        {
          owner_id: userId,
          email: data.email,
          member_user_id: member?.id ?? null,
          status: "pending",
        },
        { onConflict: "owner_id,email" },
      )
      .select("id, email, invite_token, status")
      .single();

    if (error) throw new Error(error.message);
    return { invite };
  });

/** Accept a pending invite using the invite token. Requires authenticated user. */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    if (!input.token || typeof input.token !== "string") {
      throw new Error("Token inválido");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = ((claims as { email?: string }).email ?? "").toLowerCase();

    const { data: invite, error } = await supabaseAdmin
      .from("team_members")
      .select("id, email, owner_id, status")
      .eq("invite_token", data.token)
      .maybeSingle();
    if (error || !invite) throw new Error("Convite não encontrado");
    if (invite.status === "accepted") return { ok: true };
    if (invite.status === "revoked") throw new Error("Convite revogado");
    if (email && invite.email.toLowerCase() !== email) {
      throw new Error("Este convite foi enviado para outro e-mail");
    }

    const { error: updErr } = await supabaseAdmin
      .from("team_members")
      .update({
        member_user_id: userId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

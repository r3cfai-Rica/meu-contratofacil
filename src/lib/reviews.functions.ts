import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withSupabaseAccessToken } from "@/integrations/supabase/server-fn-auth";

export interface PublicReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AdminReview extends PublicReview {
  user_id: string;
  status: "pending" | "approved" | "rejected";
}

/** Public: list approved reviews for the landing page. */
export const listApprovedReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicReview[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("id, author_name, rating, comment, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as PublicReview[];
  },
);

const submitSchema = z.object({
  author_name: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1000),
});

/** Authenticated: submit a review (status defaults to pending). */
export const submitReview = createServerFn({ method: "POST" })
  .middleware([withSupabaseAccessToken, requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      author_name: data.author_name,
      rating: data.rating,
      comment: data.comment,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list all reviews (any status). */
export const listAllReviewsAdmin = createServerFn({ method: "GET" })
  .middleware([withSupabaseAccessToken, requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminReview[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("reviews")
      .select("id, user_id, author_name, rating, comment, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminReview[];
  });

const moderateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "pending"]),
});

/** Admin: change a review's status. RLS enforces admin-only. */
export const moderateReview = createServerFn({ method: "POST" })
  .middleware([withSupabaseAccessToken, requireSupabaseAuth])
  .inputValidator((data: unknown) => moderateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("reviews")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete a review. RLS enforces admin-only. */
export const deleteReviewAdmin = createServerFn({ method: "POST" })
  .middleware([withSupabaseAccessToken, requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

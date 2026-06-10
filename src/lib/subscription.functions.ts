import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PlanTier } from "./plans";

export type ActivePlan = {
  plan: PlanTier | null;
  status: string | null;
  currentPeriodEnd: string | null;
  suspended: boolean;
  isAdmin: boolean;
};

// Returns the current active plan for the authenticated user (server source of truth).
export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivePlan> => {
    const { userId } = context;

    const [{ data: sub }, { data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("subscriptions")
        .select("plan,status,current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin.from("profiles").select("suspended").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const isAdmin = !!roles?.some((r) => r.role === "admin");
    const isActive =
      sub &&
      ["active", "trialing"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());

    // Admins get full Elite access for free.
    return {
      plan: isAdmin ? "quantum" : (isActive ? (sub!.plan as PlanTier) : null),
      status: isAdmin ? "active" : (sub?.status ?? null),
      currentPeriodEnd: sub?.current_period_end ?? null,
      suspended: !!profile?.suspended && !isAdmin,
      isAdmin,
    };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Use admin client to bypass column-level grant noise; user-scoped via .eq(id, userId).
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,display_name,telegram_chat_id,telegram_display_name,suspended,created_at,public_code")
      .eq("id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { display_name?: string; telegram_chat_id?: string | null; telegram_display_name?: string | null }) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(80).optional(),
        telegram_chat_id: z.string().trim().max(64).nullable().optional(),
        telegram_display_name: z.string().trim().max(80).nullable().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const patch: { display_name?: string; telegram_chat_id?: string | null; telegram_display_name?: string | null } = {};
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.telegram_chat_id !== undefined) patch.telegram_chat_id = data.telegram_chat_id;
    if (data.telegram_display_name !== undefined) patch.telegram_display_name = data.telegram_display_name;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("payments")
      .select("id,amount_cents,currency,status,plan,paid_at,created_at,paystack_reference")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

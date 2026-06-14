import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const METHODS = ["paypal", "bank", "card", "mobile_money", "cashapp", "crypto"] as const;

export const listMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("withdrawal_requests")
      .select("id,amount_cents,currency,method,destination,status,notes,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { withdrawals: data ?? [] };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        amount_cents: z.number().int().min(500).max(10_000_000),
        currency: z.string().length(3).toUpperCase().default("USD"),
        method: z.enum(METHODS),
        destination: z.record(z.string(), z.string().max(500)).default({}),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: saved, error } = await context.supabase
      .from("withdrawal_requests")
      .insert({
        user_id: context.userId,
        amount_cents: data.amount_cents,
        currency: data.currency,
        method: data.method,
        destination: data.destination,
        notes: data.notes ?? null,
      })
      .select("id,amount_cents,currency,method,status,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { withdrawal: saved };
  });

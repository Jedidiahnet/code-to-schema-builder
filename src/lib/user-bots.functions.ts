import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BotAccess =
  | { allowed: false; reason: string; plan: string | null }
  | { allowed: true; plan: "pro" | "elite" | "quantum"; revsharePct: number };

function botAccessForPlan(plan: string | null): BotAccess {
  if (plan === "elite" || plan === "quantum") return { allowed: true, plan, revsharePct: 0 };
  if (plan === "pro") return { allowed: true, plan: "pro", revsharePct: 8 };
  return {
    allowed: false,
    plan,
    reason:
      plan === "basic"
        ? "The Telegram bot feature is not available on the Basic plan. Upgrade to Pro, Elite or Quantum to connect your bot."
        : "Subscribe to Pro, Elite or Quantum to connect your own Telegram bot.",
  };
}

export const getMyBot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;
    const [{ data: sub }, { data: bot }, { data: subscribers }] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("plan,status,current_period_end").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("user_bots").select("id,bot_username,display_name,price_cents,period_days,currency,revshare_pct,enabled,created_at").eq("owner_id", userId).maybeSingle(),
      supabaseAdmin.from("user_bot_subscribers").select("id,status,paid_cents,owner_payout_cents,platform_fee_cents,created_at").eq("bot_id", bot_id_placeholder(userId)).limit(100),
    ]).catch(() => [{ data: null }, { data: null }, { data: null }]);

    const isActive =
      sub &&
      ["active", "trialing"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    const plan = isActive ? sub!.plan : null;
    const access = botAccessForPlan(plan);

    let subs: Array<{ id: string; status: string; paid_cents: number; owner_payout_cents: number; platform_fee_cents: number; created_at: string }> = [];
    if (bot?.id) {
      const { data } = await supabaseAdmin
        .from("user_bot_subscribers")
        .select("id,status,paid_cents,owner_payout_cents,platform_fee_cents,created_at")
        .eq("bot_id", bot.id)
        .order("created_at", { ascending: false })
        .limit(100);
      subs = data ?? [];
    }
    void subscribers;

    const earnings = subs.reduce(
      (acc, s) => {
        acc.gross += s.paid_cents;
        acc.payout += s.owner_payout_cents;
        acc.fee += s.platform_fee_cents;
        if (s.status === "active") acc.activeSubs += 1;
        return acc;
      },
      { gross: 0, payout: 0, fee: 0, activeSubs: 0 },
    );

    return { access, bot, subscribers: subs, earnings };
  });

// helper to satisfy initial parallel call without crashing (unused result)
function bot_id_placeholder(_uid: string) {
  return "00000000-0000-0000-0000-000000000000";
}

const upsertSchema = z.object({
  bot_token: z.string().trim().min(20).max(200),
  bot_username: z.string().trim().min(2).max(64).optional().nullable(),
  display_name: z.string().trim().max(120).optional().nullable(),
  price_cents: z.number().int().min(0).max(1_000_000),
  period_days: z.number().int().min(1).max(365),
  currency: z.string().trim().length(3).toUpperCase().default("USD"),
  enabled: z.boolean().default(true),
});

export const upsertMyBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;
    const { data: sub } = await supabaseAdmin
      .from("subscriptions").select("plan,status,current_period_end").eq("user_id", userId).maybeSingle();
    const isActive = sub && ["active", "trialing"].includes(sub.status);
    const plan = isActive ? sub!.plan : null;
    const access = botAccessForPlan(plan);
    if (!access.allowed) throw new Error(access.reason);

    // Validate the bot token via Telegram getMe through the connector gateway.
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (lovableKey) {
      try {
        const r = await fetch("https://api.telegram.org/bot" + encodeURIComponent(data.bot_token) + "/getMe");
        const body = await r.json().catch(() => ({}));
        if (!r.ok || !body?.ok) {
          throw new Error("Telegram rejected this token. Double-check it from @BotFather.");
        }
        if (body.result?.username) data.bot_username = body.result.username;
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Could not verify bot token");
      }
    }

    const webhookSecret = crypto.randomUUID().replace(/-/g, "");
    const row = {
      owner_id: userId,
      bot_token: data.bot_token,
      bot_username: data.bot_username ?? null,
      display_name: data.display_name ?? null,
      price_cents: data.price_cents,
      period_days: data.period_days,
      currency: data.currency,
      revshare_pct: access.revsharePct,
      enabled: data.enabled,
      webhook_secret: webhookSecret,
    };
    const { data: saved, error } = await supabaseAdmin
      .from("user_bots")
      .upsert(row, { onConflict: "owner_id" })
      .select("id,bot_username,display_name,price_cents,period_days,currency,revshare_pct,enabled")
      .single();
    if (error) throw new Error(error.message);

    // Auto-register Telegram webhook so the bot starts responding immediately.
    try {
      const { registerTelegramWebhook } = await import("./telegram-flow.server");
      const baseUrl =
        process.env.PUBLIC_APP_URL ??
        process.env.VITE_PUBLIC_APP_URL ??
        "https://tradisig.lovable.app";
      await registerTelegramWebhook(data.bot_token, saved.id, baseUrl, webhookSecret);
    } catch (e) {
      console.error("setWebhook failed", e);
    }
    return { ok: true, bot: saved, access };
  });

export const deleteMyBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_bots").delete().eq("owner_id", context.userId);
    return { ok: true };
  });

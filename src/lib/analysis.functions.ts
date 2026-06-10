import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { analyze, generateCandles, reviewBySeniorCouncil } from "./genius-ai.server";
import { allowedAgents, PLANS, type PlanTier } from "./plans";
import { fetchCandlesCore } from "./market-data.server";
import { sendTelegramMessage } from "./telegram.server";


const inputSchema = z.object({
  pair: z.string().min(3).max(16),
  timeframe: z.enum(["1m", "5m", "15m"]),
});

export const runAnalysisFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Load profile + sub + roles in parallel
    const [{ data: profile }, { data: sub }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("suspended").eq("id", userId).maybeSingle(),
      supabaseAdmin
        .from("subscriptions")
        .select("plan,status,current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const isAdmin = !!roles?.some((r) => r.role === "admin");

    if (profile?.suspended && !isAdmin) {
      throw new Error("Your account is suspended. Contact support.");
    }

    const isActive =
      sub &&
      ["active", "trialing"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    if (!isActive && !isAdmin) {
      throw new Error("No active subscription. Choose a plan to start running analyses.");
    }
    // Admins always get full Elite access for free.
    const plan: PlanTier = isAdmin ? "quantum" : (sub!.plan as PlanTier);
    const planCfg = PLANS[plan];

    // Quota check
    const today = new Date().toISOString().slice(0, 10);
    const { data: usageRow } = await supabaseAdmin
      .from("daily_usage")
      .select("analyses_count")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    const used = usageRow?.analyses_count ?? 0;
    if (!isAdmin && planCfg.dailyAnalyses !== "unlimited" && used >= planCfg.dailyAnalyses) {
      throw new Error(`Daily limit reached (${planCfg.dailyAnalyses}/day on ${planCfg.name}). Upgrade for more.`);
    }

    // Fetch candles (live → simulated fallback)
    const live = await fetchCandlesCore({ pair: data.pair, timeframe: data.timeframe, count: 100 });
    const candles = live.candles.length >= 30 ? live.candles : generateCandles(data.pair, data.timeframe);
    const dataSource: "live" | "simulated" = live.candles.length >= 30 ? "live" : "simulated";

    const full = analyze(candles);
    const allowed = allowedAgents(plan);
    const filteredAgents = full.agents.filter((a) => allowed.has(a.role));

    // Quantum tier: run the senior council on top of the junior council.
    // The delivered signal is the senior verdict; junior votes are kept on the
    // server payload only so the UI can show the interaction transcript.
    const useSenior = plan === "quantum";
    const senior = useSenior ? reviewBySeniorCouncil({ ...full, agents: filteredAgents }) : null;

    // Recompute weighted decision from filtered agents only.
    // Exclude meta-agents (they re-tally others — would double-count) and use
    // squared confidence so high-conviction signals dominate noise.
    const META_ROLES = new Set(["Neural Confluence AI", "AI Ensemble Predictor"]);
    const voters = filteredAgents.filter((a) => !META_ROLES.has(a.role));
    const sq = (c: number) => (c / 100) ** 2;
    const buyW = voters.filter((a) => a.vote === "BUY").reduce((s, a) => s + sq(a.confidence), 0);
    const sellW = voters.filter((a) => a.vote === "SELL").reduce((s, a) => s + sq(a.confidence), 0);
    const total = buyW + sellW;
    const juniorDecision: "BUY" | "SELL" = buyW >= sellW ? "BUY" : "SELL";
    const winning = juniorDecision === "BUY" ? buyW : sellW;
    const ratio = total > 0 ? winning / total : 0.5;
    const juniorConfidence = Math.round(75 + Math.min(24, (ratio - 0.5) * 2 * 24));

    const decision: "BUY" | "SELL" = senior ? senior.decision : juniorDecision;
    const confidence = senior ? senior.confidence : juniorConfidence;

    // Persist signal + bump usage (best effort)
    await supabaseAdmin.from("signals").insert({
      user_id: userId,
      pair: data.pair,
      timeframe: data.timeframe,
      decision,
      confidence,
      indicators: full.indicators as never,
      agents: filteredAgents as never,
    });
    await supabaseAdmin
      .from("daily_usage")
      .upsert({ user_id: userId, day: today, analyses_count: used + 1 });

    // Push to Telegram for Pro / Elite / Quantum (and admins) if a chat ID is saved.
    const telegramPlans: PlanTier[] = ["pro", "elite", "quantum"];
    if (telegramPlans.includes(plan)) {
      const { data: p2 } = await supabaseAdmin
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", userId)
        .maybeSingle();
      const cid = (p2?.telegram_chat_id ?? "").trim();
      if (cid) {
        void sendTelegramMessage(
          cid,
          `<b>${decision}</b> ${data.pair} · ${data.timeframe}\nConfidence: <b>${confidence}%</b>\nTrend: ${full.indicators.trend} · RSI ${full.indicators.rsi.toFixed(1)}\nSource: ${dataSource.toUpperCase()}`,
        );
      }
    }



    return {
      pair: data.pair,
      timeframe: data.timeframe,
      decision,
      confidence,
      agents: filteredAgents,
      indicators: full.indicators,
      candles,
      dataSource,
      plan,
      botCount: planCfg.botCount,
      senior: senior
        ? {
            interactions: senior.interactions,
            juniorSummary: senior.juniorSummary,
            juniorDecision,
            juniorConfidence,
          }
        : null,
      remaining:
        planCfg.dailyAnalyses === "unlimited"
          ? null
          : planCfg.dailyAnalyses - (used + 1),
    };
  });

export const getMySignals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("signals")
      .select("id,pair,timeframe,decision,confidence,outcome,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

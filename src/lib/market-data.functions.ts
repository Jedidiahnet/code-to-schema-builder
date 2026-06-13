import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchCandlesCore, fetchLiveQuoteCore, fetchNewsCore, probeAllProviders } from "./market-data.server";

const InputSchema = z.object({
  pair: z.string().min(3).max(12),
  timeframe: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d"]),
  count: z.number().int().min(30).max(500).optional(),
});

export const fetchCandles = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeaders(new Headers({ "Cache-Control": "no-store" }));
    return fetchCandlesCore(data);
  });

// Live quotes batch — used by the live ticker REST fallback.
const LiveInput = z.object({ pairs: z.array(z.string().min(6).max(8)).min(1).max(20) });
export const fetchLiveQuotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LiveInput.parse(d))
  .handler(async ({ data }) => {
    setResponseHeaders(new Headers({ "Cache-Control": "no-store" }));
    const out = await Promise.all(data.pairs.map((p) => fetchLiveQuoteCore(p)));
    return { quotes: out.map((q, i) => ({ ...q, pair: data.pairs[i] })) };
  });

export type NewsArticle = {
  id: string; title: string; description: string; url: string;
  source: string; publishedDate: string; tickers: string[];
};

const NewsInput = z.object({
  tickers: z.array(z.string().min(1).max(12)).max(10).optional(),
  limit: z.number().int().min(1).max(30).optional(),
});

export const fetchTiingoNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NewsInput.parse(d))
  .handler(async ({ data }): Promise<{ articles: NewsArticle[]; error: string | null; source?: string }> => {
    const r = await fetchNewsCore(data);
    return { articles: r.articles, error: r.error, source: r.source };
  });

// Health: now returns ALL providers (Tiingo + fallbacks).
export const tiingoHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const results = await probeAllProviders();
    const tiingo = results.find((r) => r.provider === "tiingo");
    return {
      configured: !!tiingo?.configured,
      ok: !!tiingo?.ok,
      latencyMs: tiingo?.latencyMs ?? null,
      message: tiingo?.message ?? "Not configured",
      providers: results,
    };
  });

// Hand out the Tiingo token to authenticated users for browser WebSocket use.
export const getTiingoWsToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getSecret } = await import("./secret-store.server");
    const token = (await getSecret("TIINGO_API_KEY")) ?? process.env.TIINGO_API_KEY ?? null;
    return { token };
  });

// All provider health (public to authenticated users for live status banner).
export const allProviderHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ providers: await probeAllProviders() }));

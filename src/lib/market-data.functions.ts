import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchCandlesCore } from "./market-data.server";

const InputSchema = z.object({
  pair: z.string().min(3).max(12),
  timeframe: z.enum(["1m", "5m", "15m", "30m", "1h"]),
  count: z.number().int().min(30).max(500).optional(),
});

export const fetchCandles = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeaders(
      new Headers({
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      }),
    );
    return fetchCandlesCore(data);
  });

// --- Tiingo news feed (authenticated users only) ---
const NewsInput = z.object({
  tickers: z.array(z.string().min(1).max(12)).max(10).optional(),
  limit: z.number().int().min(1).max(30).optional(),
});

export type NewsArticle = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedDate: string;
  tickers: string[];
};

export const fetchTiingoNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NewsInput.parse(d))
  .handler(async ({ data }): Promise<{ articles: NewsArticle[]; error: string | null }> => {
    const { getSecret } = await import("./secret-store.server");
    const apiKey = (await getSecret("TIINGO_API_KEY")) ?? process.env.TIINGO_API_KEY;
    if (!apiKey) return { articles: [], error: "TIINGO_API_KEY not configured. Set it in Admin → Secrets." };
    const params = new URLSearchParams({
      limit: String(data.limit ?? 12),
      sortBy: "publishedDate",
    });
    if (data.tickers?.length) params.set("tickers", data.tickers.join(","));
    try {
      const res = await fetch(`https://api.tiingo.com/tiingo/news?${params.toString()}`, {
        headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
      });
      if (!res.ok) return { articles: [], error: `HTTP ${res.status}` };
      const json = (await res.json()) as Array<{
        id: number; title: string; description: string; url: string;
        source: string; publishedDate: string; tickers?: string[];
      }>;
      return {
        articles: json.map((a) => ({
          id: String(a.id),
          title: a.title,
          description: a.description ?? "",
          url: a.url,
          source: a.source,
          publishedDate: a.publishedDate,
          tickers: a.tickers ?? [],
        })),
        error: null,
      };
    } catch (e) {
      return { articles: [], error: e instanceof Error ? e.message : "fetch failed" };
    }
  });

// --- Tiingo health / config probe (admin only-ish; authenticated) ---
export const tiingoHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getSecret } = await import("./secret-store.server");
    const apiKey = (await getSecret("TIINGO_API_KEY")) ?? process.env.TIINGO_API_KEY;
    if (!apiKey) {
      return { configured: false, ok: false, latencyMs: null, message: "TIINGO_API_KEY not configured. Set it in Admin → Secrets." };
    }
    const start = Date.now();
    try {
      const res = await fetch("https://api.tiingo.com/api/test?format=json", {
        headers: { Authorization: `Token ${apiKey}` },
      });
      const latencyMs = Date.now() - start;
      return { configured: true, ok: res.ok, latencyMs, message: res.ok ? "Connected" : `HTTP ${res.status}` };
    } catch (e) {
      return { configured: true, ok: false, latencyMs: null, message: e instanceof Error ? e.message : "fetch failed" };
    }
  });

// --- Hand out the Tiingo token to authenticated users for browser WebSocket use. ---
// Tiingo's wss endpoint requires the API token in the subscription frame. We only
// release it to signed-in users (RLS + auth middleware), not to anonymous traffic.
export const getTiingoWsToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getSecret } = await import("./secret-store.server");
    const token = (await getSecret("TIINGO_API_KEY")) ?? process.env.TIINGO_API_KEY ?? null;
    return { token };
  });

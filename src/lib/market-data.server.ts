// Multi-provider FX market data with automatic failover.
// Order: Tiingo → Twelve Data → Finnhub → Polygon → FMP → OANDA.
// Each provider is queried only if its API key is configured. If a provider returns
// an error or no data, we fall to the next one. The first provider to return a
// valid result wins.
import type { Candle } from "./genius-ai";

const TF_TIINGO: Record<string, string> = { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1hour", "4h": "4hour", "1d": "1day" };
const TF_TWELVE: Record<string, string> = { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "4h": "4h", "1d": "1day" };
const TF_POLY: Record<string, { mult: number; span: string }> = {
  "1m": { mult: 1, span: "minute" }, "5m": { mult: 5, span: "minute" },
  "15m": { mult: 15, span: "minute" }, "30m": { mult: 30, span: "minute" },
  "1h": { mult: 1, span: "hour" }, "4h": { mult: 4, span: "hour" }, "1d": { mult: 1, span: "day" },
};
const TF_MIN: Record<string, number> = { "1m": 1, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240, "1d": 1440 };

export type ProviderId = "tiingo" | "twelvedata" | "finnhub" | "polygon" | "fmp" | "oanda";

export type FetchCandlesResult = {
  candles: Candle[];
  source: ProviderId | "error";
  error: string | null;
  attempts?: { provider: ProviderId; ok: boolean; error?: string }[];
};

function normalize(pair: string) {
  return pair.replace(/[^a-zA-Z]/g, "").toUpperCase();
}
function pairSlash(pair: string) {
  const n = normalize(pair);
  return `${n.slice(0, 3)}/${n.slice(3, 6)}`;
}

async function getKey(name: string): Promise<string | undefined> {
  const { getSecret } = await import("./secret-store.server");
  return (await getSecret(name)) ?? process.env[name];
}

// -------- Per-provider candle fetchers (return null on failure) --------

async function fromTiingo(pair: string, tf: string, count: number): Promise<Candle[] | null> {
  const key = await getKey("TIINGO_API_KEY");
  if (!key) return null;
  const ticker = normalize(pair).toLowerCase();
  const freq = TF_TIINGO[tf] ?? "5min";
  const minutes = TF_MIN[tf] ?? 5;
  const start = new Date(Date.now() - count * minutes * 60_000 * 3).toISOString().slice(0, 10);
  const url = `https://api.tiingo.com/tiingo/fx/${ticker}/prices?startDate=${start}&resampleFreq=${freq}&format=json&_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store", headers: { Authorization: `Token ${key}` } });
  if (!res.ok) throw new Error(`tiingo http ${res.status}`);
  const json = await res.json() as Array<{ date: string; open: number; high: number; low: number; close: number }>;
  if (!Array.isArray(json) || !json.length) return null;
  return json.map((v) => ({ time: new Date(v.date).getTime(), open: +v.open, high: +v.high, low: +v.low, close: +v.close }))
    .filter((c) => Number.isFinite(c.close)).slice(-count);
}

async function fromTwelveData(pair: string, tf: string, count: number): Promise<Candle[] | null> {
  const key = await getKey("TWELVE_DATA_API_KEY");
  if (!key) return null;
  const symbol = pairSlash(pair);
  const interval = TF_TWELVE[tf] ?? "5min";
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${count}&apikey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`twelve http ${res.status}`);
  const json = await res.json() as { status?: string; values?: Array<{ datetime: string; open: string; high: string; low: string; close: string }>; message?: string };
  if (json.status === "error") throw new Error(json.message || "twelve error");
  if (!json.values?.length) return null;
  return json.values.map((v) => ({ time: new Date(v.datetime).getTime(), open: +v.open, high: +v.high, low: +v.low, close: +v.close }))
    .reverse().slice(-count);
}

async function fromFinnhub(pair: string, tf: string, count: number): Promise<Candle[] | null> {
  const key = await getKey("FINNHUB_API_KEY");
  if (!key) return null;
  const symbol = `OANDA:${normalize(pair).slice(0,3)}_${normalize(pair).slice(3,6)}`;
  const resolutionMap: Record<string, string> = { "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D" };
  const resolution = resolutionMap[tf] ?? "5";
  const minutes = TF_MIN[tf] ?? 5;
  const to = Math.floor(Date.now() / 1000);
  const from = to - count * minutes * 60 * 3;
  const url = `https://finnhub.io/api/v1/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`finnhub http ${res.status}`);
  const json = await res.json() as { s: string; t?: number[]; o?: number[]; h?: number[]; l?: number[]; c?: number[] };
  if (json.s !== "ok" || !json.t?.length) return null;
  return json.t.map((t, i) => ({ time: t * 1000, open: json.o![i], high: json.h![i], low: json.l![i], close: json.c![i] })).slice(-count);
}

async function fromPolygon(pair: string, tf: string, count: number): Promise<Candle[] | null> {
  const key = await getKey("POLYGON_API_KEY");
  if (!key) return null;
  const n = normalize(pair);
  const ticker = `C:${n}`;
  const { mult, span } = TF_POLY[tf] ?? { mult: 5, span: "minute" };
  const minutes = TF_MIN[tf] ?? 5;
  const to = Date.now();
  const from = to - count * minutes * 60_000 * 3;
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${mult}/${span}/${from}/${to}?adjusted=true&sort=asc&limit=${count}&apiKey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`polygon http ${res.status}`);
  const json = await res.json() as { results?: Array<{ t: number; o: number; h: number; l: number; c: number }> };
  if (!json.results?.length) return null;
  return json.results.map((v) => ({ time: v.t, open: v.o, high: v.h, low: v.l, close: v.c })).slice(-count);
}

async function fromFMP(pair: string, tf: string, count: number): Promise<Candle[] | null> {
  const key = await getKey("FMP_API_KEY");
  if (!key) return null;
  const symbol = normalize(pair);
  const intervalMap: Record<string, string> = { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1hour", "4h": "4hour", "1d": "1day" };
  const interval = intervalMap[tf] ?? "5min";
  const url = `https://financialmodelingprep.com/api/v3/historical-chart/${interval}/${symbol}?apikey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fmp http ${res.status}`);
  const json = await res.json() as Array<{ date: string; open: number; high: number; low: number; close: number }>;
  if (!Array.isArray(json) || !json.length) return null;
  return json.map((v) => ({ time: new Date(v.date + "Z").getTime(), open: +v.open, high: +v.high, low: +v.low, close: +v.close }))
    .sort((a, b) => a.time - b.time).slice(-count);
}

async function fromOanda(pair: string, tf: string, count: number): Promise<Candle[] | null> {
  const key = await getKey("OANDA_API_KEY");
  if (!key) return null;
  const env = (await getKey("OANDA_ENV")) ?? "practice"; // "practice" | "live"
  const base = env === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
  const n = normalize(pair);
  const instrument = `${n.slice(0,3)}_${n.slice(3,6)}`;
  const granMap: Record<string,string> = { "1m":"M1","5m":"M5","15m":"M15","30m":"M30","1h":"H1","4h":"H4","1d":"D" };
  const granularity = granMap[tf] ?? "M5";
  const url = `${base}/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`;
  const res = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`oanda http ${res.status}`);
  const json = await res.json() as { candles?: Array<{ time: string; mid: { o: string; h: string; l: string; c: string } }> };
  if (!json.candles?.length) return null;
  return json.candles.map((v) => ({ time: new Date(v.time).getTime(), open: +v.mid.o, high: +v.mid.h, low: +v.mid.l, close: +v.mid.c })).slice(-count);
}

const PROVIDERS: { id: ProviderId; fn: (p: string, t: string, c: number) => Promise<Candle[] | null> }[] = [
  { id: "tiingo", fn: fromTiingo },
  { id: "twelvedata", fn: fromTwelveData },
  { id: "finnhub", fn: fromFinnhub },
  { id: "polygon", fn: fromPolygon },
  { id: "fmp", fn: fromFMP },
  { id: "oanda", fn: fromOanda },
];

export async function fetchCandlesCore(input: {
  pair: string; timeframe: string; count?: number;
}): Promise<FetchCandlesResult> {
  const count = input.count ?? 100;
  const attempts: { provider: ProviderId; ok: boolean; error?: string }[] = [];
  for (const p of PROVIDERS) {
    try {
      const candles = await p.fn(input.pair, input.timeframe, count);
      if (candles && candles.length) {
        attempts.push({ provider: p.id, ok: true });
        return { candles, source: p.id, error: null, attempts };
      }
      attempts.push({ provider: p.id, ok: false, error: "empty or not configured" });
    } catch (e) {
      attempts.push({ provider: p.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return {
    candles: [], source: "error",
    error: "No market data provider returned results. Add an API key in Admin → Secrets (Tiingo, TwelveData, Finnhub, Polygon, FMP, or OANDA).",
    attempts,
  };
}

// -------- Latest quote (used by REST polling live ticker fallback) --------

export type LiveQuote = { pair: string; bid: number; ask: number; mid: number; ts: number };

export async function fetchLiveQuoteCore(pair: string): Promise<{ quote: LiveQuote | null; source: ProviderId | "error"; error: string | null }> {
  // Try fast spot endpoints first (Tiingo top, Twelve quote), then derive mid from latest candle.
  const key = await getKey("TIINGO_API_KEY");
  if (key) {
    try {
      const t = normalize(pair).toLowerCase();
      const res = await fetch(`https://api.tiingo.com/tiingo/fx/top?tickers=${t}&_=${Date.now()}`, {
        cache: "no-store", headers: { Authorization: `Token ${key}` },
      });
      if (res.ok) {
        const arr = await res.json() as Array<{ ticker: string; bidPrice: number; askPrice: number; midPrice: number; quoteTimestamp: string }>;
        if (arr?.[0]) {
          const r = arr[0];
          return { quote: { pair: r.ticker, bid: +r.bidPrice, ask: +r.askPrice, mid: +r.midPrice, ts: new Date(r.quoteTimestamp).getTime() }, source: "tiingo", error: null };
        }
      }
    } catch {/* fall through */}
  }
  const tkey = await getKey("TWELVE_DATA_API_KEY");
  if (tkey) {
    try {
      const sym = pairSlash(pair);
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(sym)}&apikey=${tkey}`, { cache: "no-store" });
      if (res.ok) {
        const j = await res.json() as { price?: string };
        if (j.price) {
          const mid = +j.price;
          return { quote: { pair: normalize(pair).toLowerCase(), bid: mid, ask: mid, mid, ts: Date.now() }, source: "twelvedata", error: null };
        }
      }
    } catch {/* */}
  }
  // Final fallback: derive from last candle in provider chain.
  const candles = await fetchCandlesCore({ pair, timeframe: "1m", count: 30 });
  if (candles.candles.length) {
    const last = candles.candles[candles.candles.length - 1];
    const mid = last.close;
    return { quote: { pair: normalize(pair).toLowerCase(), bid: mid, ask: mid, mid, ts: last.time }, source: candles.source as ProviderId, error: null };
  }
  return { quote: null, source: "error", error: candles.error };
}

// -------- News with fallback (Tiingo → Finnhub) --------

export type NewsArticle = {
  id: string; title: string; description: string; url: string;
  source: string; publishedDate: string; tickers: string[];
};

export async function fetchNewsCore(input: { tickers?: string[]; limit?: number }): Promise<{ articles: NewsArticle[]; source: string; error: string | null }> {
  const limit = input.limit ?? 12;
  const tkey = await getKey("TIINGO_API_KEY");
  if (tkey) {
    try {
      const params = new URLSearchParams({ limit: String(limit), sortBy: "publishedDate" });
      if (input.tickers?.length) params.set("tickers", input.tickers.join(","));
      const res = await fetch(`https://api.tiingo.com/tiingo/news?${params}`, {
        headers: { Authorization: `Token ${tkey}` },
      });
      if (res.ok) {
        const json = await res.json() as Array<{ id: number; title: string; description?: string; url: string; source: string; publishedDate: string; tickers?: string[] }>;
        if (json?.length) {
          return {
            articles: json.map((a) => ({ id: String(a.id), title: a.title, description: a.description ?? "", url: a.url, source: a.source, publishedDate: a.publishedDate, tickers: a.tickers ?? [] })),
            source: "tiingo", error: null,
          };
        }
      }
    } catch {/* */}
  }
  const fkey = await getKey("FINNHUB_API_KEY");
  if (fkey) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/news?category=forex&token=${fkey}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json() as Array<{ id: number; headline: string; summary: string; url: string; source: string; datetime: number; related?: string }>;
        if (json?.length) {
          return {
            articles: json.slice(0, limit).map((a) => ({ id: String(a.id), title: a.headline, description: a.summary ?? "", url: a.url, source: a.source, publishedDate: new Date(a.datetime * 1000).toISOString(), tickers: (a.related ?? "").split(",").filter(Boolean) })),
            source: "finnhub", error: null,
          };
        }
      }
    } catch {/* */}
  }
  const fmpKey = await getKey("FMP_API_KEY");
  if (fmpKey) {
    try {
      const res = await fetch(`https://financialmodelingprep.com/api/v3/forex_news?limit=${limit}&apikey=${fmpKey}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json() as Array<{ title: string; text: string; url: string; site: string; publishedDate: string; symbol?: string }>;
        if (json?.length) {
          return {
            articles: json.map((a, i) => ({ id: `fmp-${i}-${a.publishedDate}`, title: a.title, description: a.text ?? "", url: a.url, source: a.site, publishedDate: a.publishedDate, tickers: a.symbol ? [a.symbol] : [] })),
            source: "fmp", error: null,
          };
        }
      }
    } catch {/* */}
  }
  return { articles: [], source: "error", error: "No news provider configured. Add TIINGO_API_KEY, FINNHUB_API_KEY, or FMP_API_KEY in Admin → Secrets." };
}

// -------- Provider health probes --------

export type ProviderHealth = { provider: ProviderId | "finnhub_news" | "fmp_news"; configured: boolean; ok: boolean; latencyMs: number | null; message: string };

export async function probeAllProviders(): Promise<ProviderHealth[]> {
  const checks: Array<{ id: ProviderHealth["provider"]; envKey: string; url: (k: string) => string; method?: string; headers?: (k: string) => Record<string,string> }> = [
    { id: "tiingo", envKey: "TIINGO_API_KEY", url: () => "https://api.tiingo.com/api/test?format=json", headers: (k) => ({ Authorization: `Token ${k}` }) },
    { id: "twelvedata", envKey: "TWELVE_DATA_API_KEY", url: (k) => `https://api.twelvedata.com/api_usage?apikey=${k}` },
    { id: "finnhub", envKey: "FINNHUB_API_KEY", url: (k) => `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${k}` },
    { id: "polygon", envKey: "POLYGON_API_KEY", url: (k) => `https://api.polygon.io/v1/marketstatus/now?apiKey=${k}` },
    { id: "fmp", envKey: "FMP_API_KEY", url: (k) => `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${k}` },
    { id: "oanda", envKey: "OANDA_API_KEY", url: () => "https://api-fxpractice.oanda.com/v3/accounts", headers: (k) => ({ Authorization: `Bearer ${k}` }) },
  ];
  const results: ProviderHealth[] = [];
  for (const c of checks) {
    const key = await getKey(c.envKey);
    if (!key) { results.push({ provider: c.id, configured: false, ok: false, latencyMs: null, message: "Not configured" }); continue; }
    const start = Date.now();
    try {
      const res = await fetch(c.url(key), { headers: c.headers?.(key) ?? {}, cache: "no-store" });
      results.push({ provider: c.id, configured: true, ok: res.ok, latencyMs: Date.now() - start, message: res.ok ? "Connected" : `HTTP ${res.status}` });
    } catch (e) {
      results.push({ provider: c.id, configured: true, ok: false, latencyMs: Date.now() - start, message: e instanceof Error ? e.message : "fetch failed" });
    }
  }
  return results;
}

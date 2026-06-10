// Server-only core implementation of candle fetching, callable from other server fns
// without an extra HTTP hop. Uses Tiingo FX REST API.
import type { Candle } from "./genius-ai";

// Tiingo accepts resample frequencies like "1min", "5min", "15min", "30min", "1hour", "1day".
const TF_TO_RESAMPLE: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1hour",
  "4h": "4hour",
  "1d": "1day",
};

// Approximate minutes per timeframe for computing a start date window.
const TF_TO_MINUTES: Record<string, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

export type FetchCandlesResult = {
  candles: Candle[];
  source: "tiingo" | "error";
  error: string | null;
};

/** Normalize "EUR/USD" or "EURUSD" to Tiingo's "eurusd". */
function normalizePair(pair: string): string {
  return pair.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

export async function fetchCandlesCore(input: {
  pair: string;
  timeframe: string;
  count?: number;
}): Promise<FetchCandlesResult> {
  const apiKey = process.env.TIINGO_API_KEY;
  if (!apiKey) {
    return { candles: [], source: "error", error: "TIINGO_API_KEY not configured" };
  }

  const ticker = normalizePair(input.pair);
  const resampleFreq = TF_TO_RESAMPLE[input.timeframe] ?? "5min";
  const count = input.count ?? 100;
  const minutes = TF_TO_MINUTES[input.timeframe] ?? 5;

  // Pull a window large enough (×3 for weekend/holiday gaps) and slice client-side.
  const startMs = Date.now() - count * minutes * 60_000 * 3;
  const startDate = new Date(startMs).toISOString().slice(0, 10);
  const cacheBust = Date.now();

  const url =
    `https://api.tiingo.com/tiingo/fx/${ticker}/prices` +
    `?startDate=${startDate}&resampleFreq=${resampleFreq}&format=json&_=${cacheBust}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        "cache-control": "no-cache",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { candles: [], source: "error", error: `Tiingo HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}` };
    }

    const json = (await res.json()) as Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;

    if (!Array.isArray(json) || json.length === 0) {
      return { candles: [], source: "error", error: "Tiingo returned no candles" };
    }

    const candles: Candle[] = json
      .map((v) => ({
        time: new Date(v.date).getTime(),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
      }))
      .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.close) && Number.isFinite(c.time))
      .slice(-count);

    return { candles, source: "tiingo", error: null };
  } catch (e) {
    return { candles: [], source: "error", error: e instanceof Error ? e.message : "Unknown fetch error" };
  }
}

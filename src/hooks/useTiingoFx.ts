import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTiingoWsToken, fetchLiveQuotes } from "@/lib/market-data.functions";

export type FxTick = { ticker: string; bid: number; ask: number; mid: number; timestamp: number };
export type FxConnState = "idle" | "connecting" | "open" | "polling" | "unconfigured" | "error";

/**
 * Live FX feed with REST polling fallback.
 *
 * Path A: try Tiingo WebSocket. If it opens, stream ticks.
 * Path B: if WS is unavailable (no key, repeated failures, or browser blocks it),
 *         silently switch to polling /fetchLiveQuotes every 10s. The chain inside
 *         that server fn tries Tiingo → TwelveData → Finnhub → Polygon → FMP → OANDA.
 *
 * Result: the UI never gets stuck on "connecting" or shows red error banners as long
 * as ANY provider is configured.
 */
export function useTiingoFx(pairs: string[]) {
  const [ticks, setTicks] = useState<Record<string, FxTick>>({});
  const [state, setState] = useState<FxConnState>("idle");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsAttemptsRef = useRef(0);

  const tokenFn = useServerFn(getTiingoWsToken);
  const quotesFn = useServerFn(fetchLiveQuotes);

  const normalized = pairs.map((p) => p.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter(Boolean);
  const key = normalized.join(",");

  useEffect(() => {
    let cancelled = false;

    const stopWs = () => { try { wsRef.current?.close(); } catch {} wsRef.current = null; };
    const stopPoll = () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };

    async function pollOnce() {
      try {
        const res = await quotesFn({ data: { pairs: normalized } });
        if (cancelled) return;
        const map: Record<string, FxTick> = {};
        for (const q of res.quotes) {
          if (q.quote) {
            const t = q.quote;
            map[q.pair.toLowerCase()] = { ticker: q.pair.toLowerCase(), bid: t.bid, ask: t.ask, mid: t.mid, timestamp: t.ts };
          }
        }
        if (Object.keys(map).length) {
          setTicks((prev) => ({ ...prev, ...map }));
          setState("polling");
          setError(null);
        } else if (Object.keys(ticks).length === 0) {
          setState("unconfigured");
          setError("No market data provider configured. Add an API key in Admin → Secrets.");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "polling failed");
      }
    }

    function startPolling() {
      stopWs();
      stopPoll();
      void pollOnce();
      pollRef.current = setInterval(pollOnce, 10_000);
    }

    function connectWs(token: string) {
      if (cancelled) return;
      setState("connecting");
      let ws: WebSocket;
      try { ws = new WebSocket("wss://api.tiingo.com/fx"); } catch { startPolling(); return; }
      wsRef.current = ws;
      ws.onopen = () => {
        wsAttemptsRef.current = 0;
        setState("open"); setError(null);
        ws.send(JSON.stringify({ eventName: "subscribe", authorization: token, eventData: { thresholdLevel: 5, tickers: normalized } }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.messageType !== "A" || !Array.isArray(msg.data)) return;
          const [type, ticker, dateISO, , bid, mid, , ask] = msg.data;
          if (type !== "Q" || typeof ticker !== "string") return;
          setTicks((prev) => ({ ...prev, [ticker]: { ticker, bid: +bid, ask: +ask, mid: +mid, timestamp: dateISO ? new Date(dateISO).getTime() : Date.now() } }));
        } catch {}
      };
      ws.onerror = () => { /* swallow — onclose will retry/fallback */ };
      ws.onclose = () => {
        if (cancelled) return;
        wsAttemptsRef.current += 1;
        if (wsAttemptsRef.current >= 2) { startPolling(); return; }
        setTimeout(() => connectWs(token), 1500);
      };
    }

    (async () => {
      if (normalized.length === 0) return;
      try {
        const { token } = await tokenFn();
        if (cancelled) return;
        if (token && typeof WebSocket !== "undefined") connectWs(token);
        else startPolling();
      } catch {
        startPolling();
      }
    })();

    return () => { cancelled = true; stopWs(); stopPoll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ticks, state, error };
}

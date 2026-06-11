import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTiingoWsToken } from "@/lib/market-data.functions";

export type FxTick = {
  ticker: string;          // e.g. "eurusd"
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;       // ms
};

export type FxConnState = "idle" | "connecting" | "open" | "closed" | "error" | "unconfigured";

/**
 * Connects to Tiingo's FX WebSocket and streams ticks for the given pairs.
 * Auto-reconnects every 3s on close. Cleans up on unmount or pair change.
 */
export function useTiingoFx(pairs: string[]) {
  const [ticks, setTicks] = useState<Record<string, FxTick>>({});
  const [state, setState] = useState<FxConnState>("idle");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const tokenFn = useServerFn(getTiingoWsToken);

  const normalized = pairs.map((p) => p.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter(Boolean);
  const key = normalized.join(",");

  useEffect(() => {
    let cancelled = false;
    let token: string | null = null;
    attemptsRef.current = 0;

    const cleanup = () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = null;
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
      }
      wsRef.current = null;
    };

    const connect = () => {
      if (cancelled || !token || normalized.length === 0) return;
      // Cap reconnection attempts to avoid noisy infinite loops when the upstream is down.
      if (attemptsRef.current >= 5) {
        setState("error");
        setError("Live feed unavailable. Will resume on next page load.");
        return;
      }
      attemptsRef.current += 1;
      setState("connecting");

      let ws: WebSocket;
      try {
        ws = new WebSocket("wss://api.tiingo.com/fx");
      } catch (e) {
        setState("error");
        setError(e instanceof Error ? e.message : "WebSocket construction failed");
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        attemptsRef.current = 0;
        setState("open");
        setError(null);
        ws.send(JSON.stringify({
          eventName: "subscribe",
          authorization: token,
          eventData: { thresholdLevel: 5, tickers: normalized },
        }));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.messageType !== "A" || !Array.isArray(msg.data)) return;
          const [type, ticker, dateISO, , bid, mid, , ask] = msg.data;
          if (type !== "Q" || typeof ticker !== "string") return;
          setTicks((prev) => ({
            ...prev,
            [ticker]: {
              ticker, bid: Number(bid), ask: Number(ask), mid: Number(mid),
              timestamp: dateISO ? new Date(dateISO).getTime() : Date.now(),
            },
          }));
        } catch { /* ignore */ }
      };

      ws.onerror = () => {
        // Don't spam console; surface via state.
        setState("error");
      };

      ws.onclose = () => {
        if (cancelled) return;
        setState("closed");
        // Exponential backoff up to ~30s.
        const delay = Math.min(30000, 3000 * 2 ** Math.max(0, attemptsRef.current - 1));
        retryRef.current = setTimeout(connect, delay);
      };
    };

    (async () => {
      try {
        const { token: t } = await tokenFn();
        if (cancelled) return;
        if (!t) { setState("unconfigured"); setError("Live feed not yet configured."); return; }
        token = t;
        connect();
      } catch (e) {
        if (!cancelled) { setState("error"); setError(e instanceof Error ? e.message : "token fetch failed"); }
      }
    })();

    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ticks, state, error };
}

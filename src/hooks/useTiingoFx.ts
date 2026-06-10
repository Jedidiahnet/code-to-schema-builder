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
  const tokenFn = useServerFn(getTiingoWsToken);

  const normalized = pairs.map((p) => p.replace(/[^a-zA-Z]/g, "").toLowerCase()).filter(Boolean);
  const key = normalized.join(",");

  useEffect(() => {
    let cancelled = false;
    let token: string | null = null;

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
      setState("connecting");
      const ws = new WebSocket("wss://api.tiingo.com/fx");
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
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
          // Tiingo FX payload: ["Q", ticker, dateISO, bidSize, bid, midPrice, askSize, ask]
          const [type, ticker, dateISO, , bid, mid, , ask] = msg.data;
          if (type !== "Q" || typeof ticker !== "string") return;
          const tick: FxTick = {
            ticker,
            bid: Number(bid),
            ask: Number(ask),
            mid: Number(mid),
            timestamp: dateISO ? new Date(dateISO).getTime() : Date.now(),
          };
          setTicks((prev) => ({ ...prev, [ticker]: tick }));
        } catch {
          /* ignore malformed frame */
        }
      };

      ws.onerror = () => {
        setState("error");
        setError("WebSocket error");
      };

      ws.onclose = () => {
        if (cancelled) return;
        setState("closed");
        retryRef.current = setTimeout(connect, 3000);
      };
    };

    (async () => {
      try {
        const { token: t } = await tokenFn();
        if (cancelled) return;
        if (!t) { setState("unconfigured"); setError("TIINGO_API_KEY not configured"); return; }
        token = t;
        connect();
      } catch (e) {
        if (!cancelled) { setState("error"); setError(e instanceof Error ? e.message : "token fetch failed"); }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ticks, state, error };
}

import { useTiingoFx } from "@/hooks/useTiingoFx";

const DEFAULT_PAIRS = ["eurusd", "gbpusd", "usdjpy", "audusd", "usdcad", "nzdusd"];

function fmt(p: string) {
  return `${p.slice(0, 3).toUpperCase()}/${p.slice(3).toUpperCase()}`;
}

export function LiveForexTicker({ pairs = DEFAULT_PAIRS }: { pairs?: string[] }) {
  const { ticks, state, error } = useTiingoFx(pairs);

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-lg">Live FX feed</h2>
        <StateBadge state={state} />
      </div>
      {error && state !== "open" && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{error}</p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map((p) => {
          const t = ticks[p];
          return (
            <div key={p} className="rounded-xl border border-border bg-background/40 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{fmt(p)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t ? new Date(t.timestamp).toLocaleTimeString() : "—"}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-display text-xl tabular-nums">{t ? t.mid.toFixed(5) : "—"}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {t ? `${t.bid.toFixed(5)} / ${t.ask.toFixed(5)}` : "bid / ask"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: ReturnType<typeof useTiingoFx>["state"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: "idle", cls: "bg-muted/40 text-muted-foreground" },
    connecting: { label: "connecting…", cls: "bg-yellow-500/20 text-yellow-300" },
    open: { label: "live · WS", cls: "bg-emerald-500/20 text-emerald-300" },
    polling: { label: "live · REST", cls: "bg-emerald-500/20 text-emerald-300" },
    error: { label: "error", cls: "bg-red-500/20 text-red-300" },
    unconfigured: { label: "no API key", cls: "bg-muted/40 text-muted-foreground" },
  };
  const s = map[state] ?? map.idle;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${s.cls}`}>{s.label}</span>;
}

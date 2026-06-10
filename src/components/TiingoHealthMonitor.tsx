import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { tiingoHealth } from "@/lib/market-data.functions";

export function TiingoHealthMonitor() {
  const fn = useServerFn(tiingoHealth);
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["tiingo-health"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });

  const dot = !data ? "bg-muted" : data.ok ? "bg-emerald-400" : data.configured ? "bg-red-400" : "bg-yellow-400";
  const label = !data ? "checking…" : data.ok ? "Connected" : data.configured ? "Error" : "Not configured";

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="font-display text-lg">Tiingo data feed</h2>
        <button onClick={() => refetch()} disabled={isFetching} className="text-xs text-muted-foreground hover:text-foreground">
          {isFetching ? "checking…" : "re-check"}
        </button>
      </div>
      <div className="mt-3 grid gap-3 px-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Status</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <span className="text-sm">{label}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Latency</div>
          <div className="mt-1 text-sm tabular-nums">{data?.latencyMs != null ? `${data.latencyMs} ms` : "—"}</div>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Message</div>
          <div className="mt-1 text-xs text-muted-foreground">{data?.message ?? "—"}</div>
        </div>
      </div>
      {data && !data.configured && (
        <p className="mt-3 px-2 text-xs text-muted-foreground">
          Add the <span className="font-mono text-foreground">TIINGO_API_KEY</span> secret in Lovable Cloud → Secrets to enable live FX, stock and news feeds.
        </p>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchTiingoNews } from "@/lib/market-data.functions";

export function MarketNewsTerminal({ tickers }: { tickers?: string[] }) {
  const fn = useServerFn(fetchTiingoNews);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["tiingo-news", tickers?.join(",") ?? "all"],
    queryFn: () => fn({ data: { tickers, limit: 12 } }),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-lg">Market news</h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-muted-foreground hover:text-foreground"
          disabled={isFetching}
        >
          {isFetching ? "refreshing…" : "refresh"}
        </button>
      </div>
      {isLoading && <p className="mt-3 px-1 text-xs text-muted-foreground">Loading news…</p>}
      {data?.error && <p className="mt-3 px-1 text-xs text-muted-foreground">{data.error}</p>}
      <ul className="mt-3 space-y-3">
        {(data?.articles ?? []).map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-background/40 p-3">
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary">
              {a.title}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase text-muted-foreground">
              <span>{a.source}</span>
              <span>·</span>
              <span>{new Date(a.publishedDate).toLocaleString()}</span>
              {a.tickers.slice(0, 4).map((t) => (
                <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{t}</span>
              ))}
            </div>
            {a.description && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
            )}
          </li>
        ))}
        {!isLoading && (data?.articles ?? []).length === 0 && !data?.error && (
          <li className="px-1 text-xs text-muted-foreground">No news available right now.</li>
        )}
      </ul>
    </div>
  );
}

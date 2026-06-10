import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section, Stat } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/ai/feeds")({
  component: Feeds,
  head: () => ({ meta: [{ title: "Data Feeds · Admin" }] }),
});

function Feeds() {
  const ticks = Array.from({ length: 20 }).map((_, i) => `[${new Date(Date.now() - i * 1000).toISOString().slice(11, 19)}] EUR/USD bid=1.0852${i % 9} ask=1.0853${i % 7}`);
  return (
    <>
      <PageHeader title="Data Feed Ingestion" subtitle="Live tick stream, candle audit, alt-data scrapers, cache flush." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Tiingo" value="ONLINE" tone="bull" />
        <Stat label="Oanda" value="ONLINE" tone="bull" />
        <Stat label="X / Twitter" value="DEGRADED" tone="warn" />
        <Stat label="Cache size" value="412 MB" />
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-3 lg:px-8">
        <Section title="Live tick stream">
          <pre className="h-80 overflow-y-auto rounded bg-background/60 p-3 text-[10px] text-bull lg:col-span-2">{ticks.join("\n")}</pre>
        </Section>
        <Section title="Candle audit">
          <ul className="space-y-1 text-xs">
            <li className="rounded border border-bull/30 bg-bull/5 px-2 py-1">EUR/USD H1 · ✓ no gaps (24h)</li>
            <li className="rounded border border-warn/40 bg-warn/5 px-2 py-1">GBP/USD M5 · 1 gap @ 02:35</li>
            <li className="rounded border border-bull/30 bg-bull/5 px-2 py-1">XAU/USD H4 · ✓ no gaps (24h)</li>
          </ul>
          <Button size="sm" variant="destructive" className="mt-3 w-full">Flush Redis cache</Button>
        </Section>
        <Section title="Alt-data pipelines">
          <ul className="space-y-1 text-xs">
            <li>X sentiment · last ingest 12s ago</li>
            <li>Reddit /r/forex · 38s ago</li>
            <li>Bloomberg NLP · 4m ago</li>
          </ul>
        </Section>
      </div>
    </>
  );
}

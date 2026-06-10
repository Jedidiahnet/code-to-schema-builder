import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Stat } from "@/components/PageShell";
import { Gauge, GlowAreaChart } from "@/components/charts/MiniCharts";
import { series } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard/macro")({
  component: Macro,
  head: () => ({ meta: [{ title: "Macro · TradSig" }] }),
});

function Macro() {
  return (
    <>
      <PageHeader title="Global Liquidity & Macro" subtitle="Central-bank sentiment, session overlap, retail divergence." />
      <div className="grid gap-3 p-4 sm:grid-cols-3 lg:p-8">
        <Stat label="Fed" value="Hawkish" tone="bear" />
        <Stat label="ECB" value="Neutral" />
        <Stat label="BoJ" value="Dovish" tone="bull" />
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-3 lg:px-8">
        <Section title="Sentiment dial"><Gauge value={72} label="risk-on" /></Section>
        <Section title="Session volume (24h)"><GlowAreaChart data={series(24, 60, 20, 7)} color="var(--accent)" /></Section>
        <Section title="Retail vs. AI divergence">
          <ul className="space-y-1 text-xs">
            <li className="flex justify-between rounded border border-border/60 p-2"><span>EUR/USD</span><span className="text-bear">Retail 72% long · AI short</span></li>
            <li className="flex justify-between rounded border border-border/60 p-2"><span>XAU/USD</span><span className="text-bull">Aligned long</span></li>
          </ul>
        </Section>
      </div>
    </>
  );
}

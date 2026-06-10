import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Stat, Section } from "@/components/PageShell";
import { GlowAreaChart } from "@/components/charts/MiniCharts";
import { series } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard/metrics")({
  component: Metrics,
  head: () => ({ meta: [{ title: "Risk Metrics · TradSig" }] }),
});

function Metrics() {
  return (
    <>
      <PageHeader title="Trader Risk Metrics" subtitle="Sharpe, Sortino, drawdowns and prop-firm compliance." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Sharpe" value="1.82" tone="bull" />
        <Stat label="Sortino" value="2.14" tone="accent" />
        <Stat label="Max DD" value="−6.4%" tone="warn" />
        <Stat label="Prop compliance" value="OK" tone="bull" />
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-2 lg:px-8">
        <Section title="Drawdown over time"><GlowAreaChart data={series(60, 5, 2, 19)} color="var(--bear)" /></Section>
        <Section title="Psychological notes">
          <ul className="space-y-1 text-xs">
            <li className="rounded border border-warn/40 bg-warn/5 p-2">⚠ 80% of your drawdowns occur late Friday — consider closing earlier.</li>
            <li className="rounded border border-bull/30 bg-bull/5 p-2">✓ Risk discipline strong on Asian session.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}

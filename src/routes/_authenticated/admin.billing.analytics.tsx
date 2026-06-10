import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Stat, Section } from "@/components/PageShell";
import { GlowAreaChart, StackedBars, DonutChart, Gauge } from "@/components/charts/MiniCharts";
import { series, multiSeries } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/billing/analytics")({
  component: BillingAnalytics,
  head: () => ({ meta: [{ title: "Revenue Analytics · Admin" }] }),
});

function BillingAnalytics() {
  const mrr = series(60, 8200, 220, 4);
  const churn = multiSeries(12, [
    { key: "new", base: 28, vol: 10 }, { key: "lost", base: 6, vol: 4 },
  ], 9);

  return (
    <>
      <PageHeader
        title="Revenue Analytics"
        subtitle="MRR, payment mix, churn, LTV:CAC and CSV export."
        action={
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        }
      />
      <div className="grid gap-4 p-4 lg:grid-cols-4 lg:p-8">
        <Stat label="MRR" value="$12,450" delta="+8.4% MoM" />
        <Stat label="ARR" value="$149,400" delta="+11.1% YoY" tone="accent" />
        <Stat label="LTV : CAC" value="3.4x" delta="healthy >3" tone="bull" />
        <Stat label="Avg lifespan" value="14.2 mo" delta="+0.3 mo" />

        <Section title="MRR growth (60d)"><GlowAreaChart data={mrr} /></Section>
        <Section title="Payment method split">
          <DonutChart data={[
            { name: "Paystack Cards", value: 58, color: "var(--primary)" },
            { name: "Mobile Money", value: 28, color: "var(--accent)" },
            { name: "Crypto", value: 14, color: "var(--bull)" },
          ]} />
        </Section>
        <Section title="LTV : CAC ratio">
          <Gauge value={340} max={500} label="bps" />
          <p className="mt-1 text-center text-xs text-muted-foreground">Marketing spend vs. lifetime value</p>
        </Section>

        <Section title="Churn vs. expansion (12mo)" >
          <StackedBars data={churn.map(r => ({ ...r, lost: -(r.lost as number) }))} keys={[
            { key: "new", color: "var(--bull)", label: "New / Expansion" },
            { key: "lost", color: "var(--bear)", label: "Churned" },
          ]} />
        </Section>
      </div>
    </>
  );
}

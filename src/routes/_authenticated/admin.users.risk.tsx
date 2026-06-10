import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section, Stat } from "@/components/PageShell";
import { GlowAreaChart } from "@/components/charts/MiniCharts";
import { series } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/admin/users/risk")({
  component: Risk,
  head: () => ({ meta: [{ title: "User Risk · Admin" }] }),
});

function Risk() {
  return (
    <>
      <PageHeader title="Risk & Behavior" subtitle="Scraping detection, account-sharing fingerprints, equity curves, drawdown alerts." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Suspicious sessions" value="3" tone="warn" />
        <Stat label="Shared accounts" value="1" tone="bear" />
        <Stat label="Top trader (paper)" value="+38%" tone="bull" />
        <Stat label="Near drawdown" value="2 users" tone="warn" />
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-2 lg:px-8">
        <Section title="Top scraping footprints">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr><th className="p-2 text-left">User</th><th className="p-2">API/min</th><th className="p-2">Devices</th></tr></thead>
            <tbody>{["alex@x", "kane@x", "bot37@x"].map((u, i) => (
              <tr key={u} className="border-t border-border/40"><td className="p-2">{u}</td><td className="p-2 text-center text-warn">{180 - i * 30}</td><td className="p-2 text-center">{3 - i}</td></tr>
            ))}</tbody>
          </table>
        </Section>
        <Section title="Top paper-trade equity curve" >
          <GlowAreaChart data={series(60, 1000, 60, 31)} color="var(--bull)" />
        </Section>
      </div>
    </>
  );
}

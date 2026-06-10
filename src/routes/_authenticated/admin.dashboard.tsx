import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Stat, Section, Card } from "@/components/PageShell";
import { GlowAreaChart, MultiLine, StackedBars } from "@/components/charts/MiniCharts";
import { series, multiSeries, BOT_AGENTS } from "@/lib/mock-data";
import { adminMetrics } from "./admin.index";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Command Center · TradSig Admin" }] }),
});

function AdminDashboard() {
  const fn = useServerFn(adminMetrics);
  const q = useQuery({ queryKey: ["admin-metrics"], queryFn: () => fn() });
  const m = q.data;

  const signups = series(30, 12, 6, 3);
  const revenue = series(30, 380, 50, 5);
  const signals = multiSeries(14, [
    { key: "fired", base: 24, vol: 8 },
    { key: "wins", base: 14, vol: 6 },
  ], 7);

  const alerts: { ok: boolean; text: string }[] = [
    { ok: true, text: "Tiingo FX feed nominal (latency 142 ms)" },
    { ok: true, text: "Paystack webhooks delivering" },
    { ok: false, text: "Sentiment Bot #4 latency 1.8 s (warn)" },
  ];

  return (
    <>
      <PageHeader title="Command Center" subtitle="Real-time pulse of TradSig — finance, AI core and infrastructure." />
      <div className="space-y-6 p-4 lg:p-8">
        <div className={`rounded-xl border px-4 py-3 text-sm ${alerts.every(a => a.ok) ? "border-bull/30 bg-bull/5 text-bull" : "border-warn/40 bg-warn/5 text-warn"}`}>
          <div className="flex items-center gap-2">
            {alerts.every(a => a.ok) ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span className="font-semibold">{alerts.every(a => a.ok) ? "All systems nominal" : "1 system advisory"}</span>
          </div>
          <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
            {alerts.map((a, i) => <li key={i} className="opacity-90">{a.ok ? "✓" : "⚠"} {a.text}</li>)}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="MRR" value={m ? `$${(m.revenue30dCents/100).toFixed(0)}` : "—"} delta="+8.4% vs prev. week" tone="primary" />
          <Stat label="Active Users" value={m?.usersCount ?? "—"} delta="+12 / 24h" tone="accent" />
          <Stat label="Churn (30d)" value={"2.1%"} delta="−0.4% vs prev. month" tone="bull" />
          <Stat label="AI Compute" value={"$340"} delta="of $1,000 budget" tone="warn" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Financial & user velocity">
            <MultiLine
              data={signups.map((s, i) => ({ t: s.t, Signups: s.v, Revenue: revenue[i].v }))}
              keys={[{ key: "Signups", color: "var(--primary)", label: "Signups" }, { key: "Revenue", color: "var(--accent)", label: "Revenue ($)" }]}
            />
          </Section>
          <Section title="Signal output velocity">
            <StackedBars data={signals} keys={[
              { key: "wins", color: "var(--bull)", label: "Wins" },
              { key: "fired", color: "var(--primary)", label: "Fired" },
            ]} />
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="12-Bot engine latency">
            <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {BOT_AGENTS.map((b, i) => {
                const ms = 120 + ((i * 37) % 600);
                const tone = ms > 600 ? "text-bear" : ms > 350 ? "text-warn" : "text-bull";
                return (
                  <li key={b} className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                    <span className="truncate">{b}</span>
                    <span className={`font-mono ${tone}`}>{ms} ms</span>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title="Live activity">
            <ul className="space-y-2 text-xs">
              {[
                "User #492 upgraded to Quantum (Paystack)",
                "Signal #8922 fired EUR/USD BUY · 10/12 consensus",
                "User #104 connected Discord webhook",
                "DB snapshot complete · 1.2 GB",
                "User #311 unsubscribed (low engagement)",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border border-border/40 bg-background/40 px-2 py-1.5">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Jump to</h2>
              <p className="mt-1 text-sm">Open analytics, secrets, support tickets and more from the sidebar.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link to="/admin/billing/analytics" className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:border-primary/60">Revenue analytics →</Link>
              <Link to="/admin/ai/council" className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:border-primary/60">AI Council →</Link>
              <Link to="/admin/support/tickets" className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:border-primary/60">Tickets →</Link>
            </div>
          </div>
          <div className="mt-4">
            <GlowAreaChart data={series(60, 200, 30, 11)} />
          </div>
        </Card>
      </div>
    </>
  );
}

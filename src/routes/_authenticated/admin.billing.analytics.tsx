import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Stat, Section } from "@/components/PageShell";
import { adminMetrics } from "./admin.index";

export const Route = createFileRoute("/_authenticated/admin/billing/analytics")({
  component: BillingAnalytics,
  head: () => ({ meta: [{ title: "Revenue Analytics · Admin" }] }),
});

function BillingAnalytics() {
  const fn = useServerFn(adminMetrics);
  const q = useQuery({ queryKey: ["admin-metrics"], queryFn: () => fn() });
  const m = q.data;
  const arpu = m && m.activeSubs > 0 ? (m.revenue30dCents / 100 / m.activeSubs).toFixed(2) : "—";

  return (
    <>
      <PageHeader title="Revenue Analytics" subtitle="Live MRR, ARR and plan mix sourced from your payments table." />
      <div className="grid gap-4 p-4 lg:grid-cols-4 lg:p-8">
        <Stat label="Revenue (30d)" value={m ? `$${(m.revenue30dCents / 100).toFixed(2)}` : "—"} tone="primary" />
        <Stat label="Active subscribers" value={m?.activeSubs ?? "—"} tone="bull" />
        <Stat label="Estimated ARR" value={m ? `$${((m.revenue30dCents / 100) * 12).toFixed(0)}` : "—"} tone="accent" />
        <Stat label="ARPU (30d)" value={arpu === "—" ? "—" : `$${arpu}`} />

        <Section title="Plan distribution">
          {m ? (
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {(["basic","pro","elite","quantum"] as const).map((p) => (
                <div key={p} className="rounded border border-border/60 bg-background/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p}</div>
                  <div className="mt-1 font-display text-xl">{m.byPlan[p] ?? 0}</div>
                </div>
              ))}
            </div>
          ) : <div className="py-6 text-center text-xs text-muted-foreground">Loading…</div>}
        </Section>
      </div>
    </>
  );
}

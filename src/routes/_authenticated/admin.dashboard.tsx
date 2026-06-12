import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Stat, Section, Card } from "@/components/PageShell";
import { adminMetrics } from "./admin.index";
import { listAuditLogs } from "@/lib/admin-secrets.functions";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Command Center · TradSig Admin" }] }),
});

function AdminDashboard() {
  const fn = useServerFn(adminMetrics);
  const auditFn = useServerFn(listAuditLogs);
  const q = useQuery({ queryKey: ["admin-metrics"], queryFn: () => fn() });
  const auditQ = useQuery({
    queryKey: ["admin-audit-recent"],
    queryFn: () => auditFn({ data: { limit: 8 } }).then((r) => r.logs).catch(() => []),
  });
  const m = q.data;

  const activity = (auditQ.data ?? []) as Array<{ id: string; action: string; actor_email: string | null; created_at: string }>;

  return (
    <>
      <PageHeader title="Command Center" subtitle="Real-time pulse of TradSig — finance, AI core and infrastructure." />
      <div className="space-y-6 p-4 lg:p-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Revenue (30d)" value={m ? `$${(m.revenue30dCents / 100).toFixed(2)}` : "—"} tone="primary" />
          <Stat label="Users" value={m?.usersCount ?? "—"} tone="accent" />
          <Stat label="Active subs" value={m?.activeSubs ?? "—"} tone="bull" />
          <Stat
            label="Plan mix"
            value={m ? `B${m.byPlan.basic ?? 0} · P${m.byPlan.pro ?? 0} · E${m.byPlan.elite ?? 0} · Q${m.byPlan.quantum ?? 0}` : "—"}
            tone="warn"
          />
        </div>

        <Section title="Recent admin activity">
          {activity.length === 0 ? (
            <div className="rounded-md border border-border/40 bg-background/30 px-3 py-6 text-center text-xs text-muted-foreground">
              No audit events yet. Actions taken by admins or the AI assistant will appear here.
            </div>
          ) : (
            <ul className="space-y-2 text-xs">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2 rounded-md border border-border/40 bg-background/40 px-2 py-1.5">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="flex-1">
                    <span className="font-mono text-primary">{a.action}</span>
                    {a.actor_email ? <span className="text-muted-foreground"> · {a.actor_email}</span> : null}
                  </span>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Jump to</h2>
              <p className="mt-1 text-sm">Open analytics, secrets, support tickets and more from the sidebar.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link to="/admin/billing/analytics" className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:border-primary/60">Revenue analytics →</Link>
              <Link to="/admin/secrets" className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:border-primary/60">API keys →</Link>
              <Link to="/admin/support/tickets" className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:border-primary/60">Tickets →</Link>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

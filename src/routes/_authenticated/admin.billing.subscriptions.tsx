import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PageHeader, Card, Stat } from "@/components/PageShell";

export const adminListSubs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Admin required");
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("id,user_id,plan,status,current_period_end,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data?.length) return [];
    const ids = data.map((s) => s.user_id);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,email,public_code").in("id", ids);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return data.map((s) => ({ ...s, email: pmap.get(s.user_id)?.email ?? null, code: pmap.get(s.user_id)?.public_code ?? null }));
  });

export const Route = createFileRoute("/_authenticated/admin/billing/subscriptions")({
  component: SubsAdmin,
  head: () => ({ meta: [{ title: "Subscriptions · Admin" }] }),
});

function SubsAdmin() {
  const fn = useServerFn(adminListSubs);
  const q = useQuery({ queryKey: ["admin-subs"], queryFn: () => fn() });
  const rows = q.data ?? [];

  const active = rows.filter((s) => ["active", "trialing"].includes(s.status));
  const pastDue = rows.filter((s) => s.status === "past_due");

  return (
    <>
      <PageHeader title="Subscription Management" subtitle="Live subscriptions across all plans." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Active" value={active.length} tone="bull" />
        <Stat label="Past due" value={pastDue.length} tone="bear" />
        <Stat label="Quantum" value={active.filter((s) => s.plan === "quantum").length} tone="accent" />
        <Stat label="Elite" value={active.filter((s) => s.plan === "elite").length} tone="primary" />
      </div>
      <div className="px-4 pb-8 lg:px-8">
        <Card className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {q.isLoading ? "Loading…" : "No subscriptions yet. Use the User Directory to grant plans manually, or wait for paid sign-ups."}
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr>
                <th className="p-3 text-left">Code</th><th className="p-3 text-left">User</th><th className="p-3 text-left">Plan</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Renews</th>
              </tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t border-border/40">
                    <td className="p-3 font-mono text-xs text-primary">{s.code ?? "—"}</td>
                    <td className="p-3">{s.email ?? "—"}</td>
                    <td className="p-3 capitalize">{s.plan}</td>
                    <td className="p-3"><span className={`rounded px-2 py-0.5 text-[10px] uppercase ${s.status === "active" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"}`}>{s.status}</span></td>
                    <td className="p-3 text-xs text-muted-foreground">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card } from "@/components/PageShell";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminRecentAudit } from "@/lib/admin-secrets.functions";

export const Route = createFileRoute("/_authenticated/admin/settings/audit")({
  component: Audit,
  head: () => ({ meta: [{ title: "Audit Trail · Admin" }] }),
});

function Audit() {
  const fn = useServerFn(adminRecentAudit);
  const q = useQuery({ queryKey: ["audit"], queryFn: () => fn({ data: { limit: 100 } }) });
  const rows = q.data?.entries ?? [];

  return (
    <>
      <PageHeader title="System Audit Trail" subtitle="Immutable record of every admin action and AI command." />
      <div className="p-4 lg:p-8">
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3 text-left">When</th><th className="p-3 text-left">Actor</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Target</th><th className="p-3 text-left">Details</th>
            </tr></thead>
            <tbody>{rows.map((r: { id: string; created_at: string; actor_email: string | null; action: string; target_type: string | null; target_id: string | null; details: unknown }) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3 text-xs">{r.actor_email ?? "system"}</td>
                <td className="p-3 font-mono text-xs text-primary">{r.action}</td>
                <td className="p-3 text-xs">{r.target_type}:{r.target_id}</td>
                <td className="p-3 text-xs text-muted-foreground"><pre className="max-w-md overflow-x-auto">{JSON.stringify(r.details, null, 0)}</pre></td>
              </tr>
            ))}{rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">No audit entries yet.</td></tr>}</tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

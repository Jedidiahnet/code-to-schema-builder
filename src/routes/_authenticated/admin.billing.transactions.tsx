import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PageHeader, Card } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Admin required");
    const { data } = await supabaseAdmin
      .from("payments")
      .select("id,paystack_reference,amount_cents,currency,status,plan,paid_at,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const Route = createFileRoute("/_authenticated/admin/billing/transactions")({
  component: TxLedger,
  head: () => ({ meta: [{ title: "Transactions · Admin" }] }),
});

function TxLedger() {
  const fn = useServerFn(adminListPayments);
  const q = useQuery({ queryKey: ["admin-payments"], queryFn: () => fn() });
  const [search, setSearch] = useState("");
  const rows = (q.data ?? []).filter((r) => !search || (r.paystack_reference ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Transaction Ledger" subtitle="Every charge attempt recorded against your platform." />
      <div className="space-y-4 p-4 lg:p-8">
        <Card>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </Card>
        <Card className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {q.isLoading ? "Loading…" : "No transactions yet. They will appear here once users complete checkout."}
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Reference</th><th className="p-3 text-left">Plan</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">When</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="p-3 font-mono text-xs text-primary">{r.paystack_reference ?? "—"}</td>
                    <td className="p-3 capitalize">{r.plan ?? "—"}</td>
                    <td className="p-3">{(r.amount_cents / 100).toFixed(2)} {r.currency}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${r.status === "success" ? "bg-bull/15 text-bull" : r.status === "refunded" ? "bg-warn/15 text-warn" : "bg-bear/15 text-bear"}`}>{r.status}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
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

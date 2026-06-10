import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/billing/transactions")({
  component: TxLedger,
  head: () => ({ meta: [{ title: "Transactions · Admin" }] }),
});

const ROWS = Array.from({ length: 20 }).map((_, i) => ({
  ref: `PSK_${1000 + i}`,
  user: `user${i + 1}@trad.sig`,
  amount: ((i % 5) + 1) * 99,
  status: i % 7 === 0 ? "failed" : i % 4 === 0 ? "refunded" : "success",
  ts: new Date(Date.now() - i * 3600 * 1000).toISOString(),
}));

function TxLedger() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rows = ROWS.filter(r => !q || r.user.includes(q) || r.ref.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Transaction Ledger" subtitle="Every charge attempt across all providers." />
      <div className="space-y-4 p-4 lg:p-8">
        <Card>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by email, reference, invoice ID…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Reference</th><th className="p-3 text-left">User</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">When</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <>
                  <tr key={r.ref} className="border-t border-border/40">
                    <td className="p-3 font-mono text-xs text-primary">{r.ref}</td>
                    <td className="p-3">{r.user}</td>
                    <td className="p-3">${r.amount}.00</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${r.status === "success" ? "bg-bull/15 text-bull" : r.status === "refunded" ? "bg-warn/15 text-warn" : "bg-bear/15 text-bear"}`}>{r.status}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(r.ts).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpen(open === r.ref ? null : r.ref)}>View JSON</Button>
                      {r.status === "success" && <Button size="sm" variant="outline" className="ml-2">Refund</Button>}
                    </td>
                  </tr>
                  {open === r.ref && (
                    <tr><td colSpan={6} className="border-t border-border/40 bg-background/60 p-3">
                      <pre className="overflow-x-auto rounded bg-background/80 p-3 text-[11px]">{JSON.stringify({ event: "charge.success", data: r }, null, 2)}</pre>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

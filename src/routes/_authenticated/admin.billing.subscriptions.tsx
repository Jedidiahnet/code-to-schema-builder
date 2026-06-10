import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Stat } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/billing/subscriptions")({
  component: SubsAdmin,
  head: () => ({ meta: [{ title: "Subscriptions · Admin" }] }),
});

const SUBS = Array.from({ length: 14 }).map((_, i) => ({
  email: `trader${i + 1}@trad.sig`,
  plan: (["basic", "pro", "elite", "quantum"] as const)[i % 4],
  renewsIn: 30 - ((i * 3) % 30),
  status: i % 9 === 0 ? "past_due" : "active",
}));

function SubsAdmin() {
  const [comp, setComp] = useState<Record<string, number>>({});
  return (
    <>
      <PageHeader title="Subscription Management" subtitle="Active subscribers, comped days and force-renewal controls." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Active subs" value={SUBS.filter(s => s.status === "active").length} tone="bull" />
        <Stat label="Past due" value={SUBS.filter(s => s.status === "past_due").length} tone="bear" />
        <Stat label="Quantum" value={SUBS.filter(s => s.plan === "quantum").length} tone="accent" />
        <Stat label="ARPU" value="$87" tone="primary" />
      </div>
      <div className="px-4 pb-8 lg:px-8">
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3 text-left">User</th><th className="p-3 text-left">Plan</th><th className="p-3 text-left">Renews in</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Comp days</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {SUBS.map(s => (
                <tr key={s.email} className="border-t border-border/40">
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">
                    <Select defaultValue={s.plan}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["basic", "pro", "elite", "quantum"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-xs">{s.renewsIn} d</td>
                  <td className="p-3"><span className={`rounded px-2 py-0.5 text-[10px] uppercase ${s.status === "active" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"}`}>{s.status}</span></td>
                  <td className="p-3"><Input type="number" min={0} className="h-8 w-20" value={comp[s.email] ?? 0} onChange={(e) => setComp({ ...comp, [s.email]: Number(e.target.value) })} /></td>
                  <td className="p-3 text-right"><Button size="sm" variant="outline">Force renew</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

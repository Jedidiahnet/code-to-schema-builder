import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Stat, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/billing/affiliates")({
  component: Aff,
  head: () => ({ meta: [{ title: "Affiliates · Admin" }] }),
});

const IBS = Array.from({ length: 8 }).map((_, i) => ({
  name: `Broker-${i + 1}`,
  code: `IB-${(1000 + i).toString(36).toUpperCase()}`,
  clicks: 800 + i * 120,
  conv: 12 + i * 2,
  earned: (12 + i * 2) * 49,
  pending: i % 3 === 0 ? (12 + i * 2) * 18 : 0,
}));

function Aff() {
  const [tier, setTier] = useState({ standard: 20, elite: 35 });
  return (
    <>
      <PageHeader title="Affiliate & IB Portal" subtitle="Track introducing brokers, commissions and payouts." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Active IBs" value={IBS.length} />
        <Stat label="Pending payout" value={`$${IBS.reduce((s, i) => s + i.pending, 0)}`} tone="warn" />
        <Stat label="Earned (30d)" value={`$${IBS.reduce((s, i) => s + i.earned, 0)}`} tone="bull" />
        <Stat label="Avg conv. rate" value="4.2%" tone="accent" />
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-3 lg:px-8">
        <Section title="Tier rules" >
          <label className="block text-xs text-muted-foreground">Standard (%)</label>
          <Input type="number" value={tier.standard} onChange={(e) => setTier({ ...tier, standard: Number(e.target.value) })} className="mb-2" />
          <label className="block text-xs text-muted-foreground">Elite (%)</label>
          <Input type="number" value={tier.elite} onChange={(e) => setTier({ ...tier, elite: Number(e.target.value) })} />
          <Button size="sm" className="mt-3 w-full">Save tiers</Button>
        </Section>
        <Card className="overflow-x-auto p-0 lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3 text-left">IB</th><th className="p-3 text-left">Code</th><th className="p-3 text-left">Clicks</th><th className="p-3 text-left">Conv.</th><th className="p-3 text-left">Earned</th><th className="p-3 text-left">Pending</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {IBS.map(i => (
                <tr key={i.code} className="border-t border-border/40">
                  <td className="p-3">{i.name}</td>
                  <td className="p-3 font-mono text-xs text-primary">{i.code}</td>
                  <td className="p-3 text-xs">{i.clicks}</td>
                  <td className="p-3 text-xs">{i.conv}</td>
                  <td className="p-3 text-xs">${i.earned}</td>
                  <td className="p-3 text-xs text-warn">${i.pending}</td>
                  <td className="p-3 text-right">{i.pending > 0 && <Button size="sm" variant="outline">Approve</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

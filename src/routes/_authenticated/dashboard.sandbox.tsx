import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Card } from "@/components/PageShell";
import { GlowAreaChart } from "@/components/charts/MiniCharts";
import { series, BOT_AGENTS } from "@/lib/mock-data";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/sandbox")({
  component: Sandbox,
  head: () => ({ meta: [{ title: "Sandbox · TradSig" }] }),
});

function Sandbox() {
  const [weights, setWeights] = useState<Record<string, number>>(Object.fromEntries(BOT_AGENTS.map(b => [b, 50])));
  return (
    <>
      <PageHeader title="Strategy Sandbox" subtitle="Paper-trade with custom AI weights and stress-test ideas." />
      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-8">
        <Section title="Funding"><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Virtual balance</span><Input type="number" defaultValue={10000} className="w-32" /></div></Section>
        <Section title="Open positions"><div className="text-xs text-muted-foreground">No open virtual trades.</div></Section>
        <Section title="Equity curve"><GlowAreaChart data={series(60, 10000, 200, 41)} color="var(--bull)" /></Section>
        <Card className="lg:col-span-3">
          <h3 className="mb-3 font-display text-sm uppercase text-muted-foreground">Council weights</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BOT_AGENTS.map(b => (
              <div key={b}>
                <div className="flex justify-between text-xs"><span>{b}</span><span className="font-mono text-primary">{weights[b]}%</span></div>
                <Slider value={[weights[b]]} onValueChange={(v) => setWeights({ ...weights, [b]: v[0] })} min={0} max={100} />
              </div>
            ))}
          </div>
          <Button className="mt-4">Save strategy</Button>
        </Card>
      </div>
    </>
  );
}

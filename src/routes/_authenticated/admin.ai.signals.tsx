import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section } from "@/components/PageShell";
import { GlowAreaChart } from "@/components/charts/MiniCharts";
import { series, BOT_AGENTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/ai/signals")({
  component: SignalLog,
  head: () => ({ meta: [{ title: "Signal Audit · Admin" }] }),
});

const SIGNALS = Array.from({ length: 18 }).map((_, i) => ({
  id: `SIG-${9000 + i}`,
  pair: ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"][i % 4],
  dir: i % 3 === 0 ? "SELL" : "BUY",
  entry: 1.0850 + i * 0.0012,
  sl: 1.078, tp: 1.094,
  consensus: 6 + (i % 7),
  when: new Date(Date.now() - i * 1800 * 1000).toISOString(),
}));

function SignalLog() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Signal Audit Log" subtitle="Every signal generated, per-agent reasoning, alpha-decay tracker." />
      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-8">
        <Section title="Alpha decay (rolling 30d)" >
          <GlowAreaChart data={series(30, 65, 6, 23)} color="var(--accent)" />
        </Section>
        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3 text-left">ID</th><th className="p-3">Pair</th><th className="p-3">Dir</th><th className="p-3">Entry</th><th className="p-3">Consensus</th><th className="p-3">When</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {SIGNALS.map(s => (
                <>
                  <tr key={s.id} className="border-t border-border/40">
                    <td className="p-3 font-mono text-xs text-primary">{s.id}</td>
                    <td className="p-3 text-center">{s.pair}</td>
                    <td className={`p-3 text-center font-semibold ${s.dir === "BUY" ? "text-bull" : "text-bear"}`}>{s.dir}</td>
                    <td className="p-3 text-center font-mono text-xs">{s.entry.toFixed(4)}</td>
                    <td className="p-3 text-center text-xs">{s.consensus}/12</td>
                    <td className="p-3 text-center text-xs text-muted-foreground">{new Date(s.when).toLocaleTimeString()}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpen(open === s.id ? null : s.id)}>Votes</Button>
                      <Button size="sm" variant="destructive" className="ml-2">Retract</Button>
                    </td>
                  </tr>
                  {open === s.id && (
                    <tr><td colSpan={7} className="border-t border-border/40 bg-background/60 p-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        {BOT_AGENTS.map((b, i) => (
                          <div key={b} className="rounded border border-border/60 bg-background/40 p-2 text-xs">
                            <div className="flex justify-between"><span>{b}</span><span className={`font-mono ${i % 3 === 0 ? "text-bear" : "text-bull"}`}>{50 + ((i * 7) % 45)}%</span></div>
                            <p className="mt-1 text-[10px] text-muted-foreground">Bias: {i % 2 ? "trend continuation" : "mean reversion"} on H1.</p>
                          </div>
                        ))}
                      </div>
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

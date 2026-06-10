import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, Card } from "@/components/PageShell";
import { GlowAreaChart } from "@/components/charts/MiniCharts";
import { series } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard/signals")({
  component: SignalArchive,
  head: () => ({ meta: [{ title: "Signal Archive · TradSig" }] }),
});

const ROWS = Array.from({ length: 16 }).map((_, i) => ({
  id: `SIG-${8000 + i}`,
  pair: ["EUR/USD","GBP/USD","USD/JPY","XAU/USD"][i % 4],
  dir: i % 3 === 0 ? "SELL" : "BUY",
  entry: 1.085 + i * 0.001,
  tp: 1.094, sl: 1.078,
  pnl: ((i % 5) - 2) * 0.6,
  bots: 7 + (i % 6),
  date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
}));

function SignalArchive() {
  return (
    <>
      <PageHeader title="Signal Archive" subtitle="Every closed signal with full reasoning + verified equity link." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Card><div className="text-xs text-muted-foreground">Win rate (30d)</div><div className="font-display text-2xl text-bull">68%</div></Card>
        <Card><div className="text-xs text-muted-foreground">Avg R:R</div><div className="font-display text-2xl text-primary">1 : 2.1</div></Card>
        <Card><div className="text-xs text-muted-foreground">Profit factor</div><div className="font-display text-2xl text-accent">2.4</div></Card>
        <Card><div className="text-xs text-muted-foreground">Myfxbook</div><a className="text-bull underline" href="#">verified ↗</a></Card>
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-3 lg:px-8">
        <Section title="Equity curve (paper)"><GlowAreaChart data={series(60, 1000, 40, 17)} color="var(--bull)" /></Section>
        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <div className="flex gap-2 p-3">
            <Select defaultValue="all"><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent>
              {["all","EUR/USD","GBP/USD","XAU/USD"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent></Select>
            <Select defaultValue="any"><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="any">Any consensus</SelectItem><SelectItem value="10">10+/12</SelectItem><SelectItem value="12">12/12</SelectItem>
            </SelectContent></Select>
          </div>
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">ID</th><th className="p-2">Pair</th><th className="p-2">Dir</th><th className="p-2">Entry</th><th className="p-2">PnL</th><th className="p-2">Bots</th><th className="p-2">Date</th></tr></thead>
            <tbody>{ROWS.map(r => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-2 font-mono text-xs text-primary">{r.id}</td>
                <td className="p-2 text-center">{r.pair}</td>
                <td className={`p-2 text-center font-semibold ${r.dir === "BUY" ? "text-bull" : "text-bear"}`}>{r.dir}</td>
                <td className="p-2 text-center font-mono text-xs">{r.entry.toFixed(4)}</td>
                <td className={`p-2 text-center text-xs ${r.pnl >= 0 ? "text-bull" : "text-bear"}`}>{r.pnl >= 0 ? "+" : ""}{r.pnl.toFixed(2)}%</td>
                <td className="p-2 text-center text-xs">{r.bots}/12</td>
                <td className="p-2 text-center text-xs text-muted-foreground">{r.date}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

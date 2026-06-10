import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section, Stat } from "@/components/PageShell";
import { BOT_AGENTS } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/ai/council")({
  component: Council,
  head: () => ({ meta: [{ title: "AI Council · Admin" }] }),
});

function Council() {
  const radar = BOT_AGENTS.map((b, i) => ({ subject: b, accuracy: 55 + ((i * 13) % 40) }));
  return (
    <>
      <PageHeader title="12-Bot Council" subtitle="Live ops, latency, model versions and memory vectors." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Bots online" value="12 / 12" tone="bull" />
        <Stat label="Avg latency" value="284 ms" tone="primary" />
        <Stat label="24h win rate" value="68%" tone="accent" />
        <Stat label="Drift alerts" value="1" tone="warn" />
      </div>

      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-3 lg:px-8">
        <Section title="Bot matrix" >
          <ul className="space-y-2 text-xs">
            {BOT_AGENTS.map((b, i) => {
              const ms = 120 + ((i * 41) % 700);
              const ok = ms < 500;
              return (
                <li key={b} className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 p-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${ok ? "bg-bull" : "bg-warn"}`} />
                    <span>{b}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{ms}ms</span>
                    <Select defaultValue="gpt-4o">
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="claude-3.5">Claude 3.5</SelectItem>
                        <SelectItem value="gemini-3">Gemini 3 Flash</SelectItem>
                        <SelectItem value="custom">Custom fine-tune</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
        <Section title="Individual alpha (radar)" >
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radar}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} stroke="var(--border)" />
              <Radar name="Accuracy" dataKey="accuracy" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </Section>
        <Card>
          <h3 className="mb-2 font-display text-sm uppercase text-muted-foreground">Memory vector index</h3>
          <p className="text-xs text-muted-foreground">Currently referencing market regimes:</p>
          <ul className="mt-2 space-y-1 text-xs">
            {["2020 COVID flash", "2022 USD strength", "2024 BoJ pivot", "EURUSD low-vol Aug-25", "GBP risk-off Q3-25"].map(t => (
              <li key={t} className="rounded border border-border/60 bg-background/40 px-2 py-1">{t}</li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

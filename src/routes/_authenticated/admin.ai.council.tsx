import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section, Stat } from "@/components/PageShell";
import { AGENT_ORDER } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin/ai/council")({
  component: Council,
  head: () => ({ meta: [{ title: "AI Council · Admin" }] }),
});

function Council() {
  return (
    <>
      <PageHeader title="AI Council" subtitle="The 27 junior + 27 senior agents that power Genius AI." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Bots registered" value={AGENT_ORDER.length} tone="bull" />
        <Stat label="Live latency" value="—" tone="primary" />
        <Stat label="24h win rate" value="—" tone="accent" />
        <Stat label="Drift alerts" value={0} />
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:grid-cols-2 lg:px-8">
        <Section title="Agent registry">
          <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {AGENT_ORDER.map((b) => (
              <li key={b} className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                <span>{b}</span>
                <span className="font-mono text-[10px] text-muted-foreground">live</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Performance metrics">
          <Card className="bg-background/40 text-xs text-muted-foreground">
            Per-agent accuracy will appear once your evaluation harness writes results back to the database.
          </Card>
        </Section>
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";
import { TiingoHealthMonitor } from "@/components/TiingoHealthMonitor";

export const Route = createFileRoute("/_authenticated/admin/ai/feeds")({
  component: Feeds,
  head: () => ({ meta: [{ title: "Data Feeds · Admin" }] }),
});

function Feeds() {
  return (
    <>
      <PageHeader title="Data Feed Health" subtitle="Live status of every upstream price and news feed." />
      <div className="space-y-4 p-4 lg:p-8">
        <Section title="Tiingo (live FX)">
          <TiingoHealthMonitor />
        </Section>
        <Section title="Additional feeds">
          <p className="text-xs text-muted-foreground">
            Oanda, Polygon and news pipelines are configured under <span className="font-mono text-foreground">Admin → API Secret Vault</span>.
            Health probes will appear here once the API keys are added.
          </p>
        </Section>
      </div>
    </>
  );
}

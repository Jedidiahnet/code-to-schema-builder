import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section, Stat } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/admin/users/risk")({
  component: Risk,
  head: () => ({ meta: [{ title: "User Risk · Admin" }] }),
});

function Risk() {
  return (
    <>
      <PageHeader title="Risk & Behavior" subtitle="Account sharing, scraping detection and equity-curve monitoring." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Suspicious sessions" value={0} />
        <Stat label="Shared accounts" value={0} />
        <Stat label="Top trader" value="—" />
        <Stat label="Near drawdown" value={0} />
      </div>
      <div className="px-4 pb-8 lg:px-8">
        <Section title="Behavior signals">
          <Card className="bg-background/40 text-xs text-muted-foreground">
            Risk telemetry will populate once the behavioral analytics pipeline is connected. No fabricated data is shown.
          </Card>
        </Section>
      </div>
    </>
  );
}

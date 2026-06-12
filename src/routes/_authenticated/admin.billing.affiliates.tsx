import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Stat, Section } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/admin/billing/affiliates")({
  component: Aff,
  head: () => ({ meta: [{ title: "Affiliates · Admin" }] }),
});

function Aff() {
  return (
    <>
      <PageHeader title="Affiliate & IB Portal" subtitle="Track introducing brokers, commissions and payouts." />
      <div className="grid gap-3 p-4 sm:grid-cols-4 lg:p-8">
        <Stat label="Active IBs" value={0} />
        <Stat label="Pending payout" value="$0" tone="warn" />
        <Stat label="Earned (30d)" value="$0" tone="bull" />
        <Stat label="Avg conv. rate" value="—" tone="accent" />
      </div>
      <div className="grid gap-4 px-4 pb-8 lg:px-8">
        <Section title="Affiliate program">
          <Card className="bg-background/40 text-xs text-muted-foreground">
            No affiliates onboarded yet. Wire your referral codes through the public sign-up flow and they will appear here.
          </Card>
        </Section>
      </div>
    </>
  );
}

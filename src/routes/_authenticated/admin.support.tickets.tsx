import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Section } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/admin/support/tickets")({
  component: Tickets,
  head: () => ({ meta: [{ title: "Tickets · Admin" }] }),
});

function Tickets() {
  return (
    <>
      <PageHeader title="Support Tickets" subtitle="Live customer threads come into the Inbox below." />
      <div className="p-4 lg:p-8 space-y-4">
        <Section title="Inbox">
          <Card className="bg-background/40 text-xs text-muted-foreground">
            All customer messages flow through{" "}
            <Link to="/admin/messages" className="text-primary underline">Admin → Inbox</Link>.
            A dedicated ticketing workflow is planned; for now reply directly from Inbox.
          </Card>
        </Section>
      </div>
    </>
  );
}

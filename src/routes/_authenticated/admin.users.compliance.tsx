import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/admin/users/compliance")({
  component: Comp,
  head: () => ({ meta: [{ title: "KYC Queue · Admin" }] }),
});

function Comp() {
  return (
    <>
      <PageHeader title="KYC & Compliance Queue" subtitle="Review uploads, run sanctions checks, approve / reject." />
      <div className="p-4 lg:p-8">
        <Section title="Pending review">
          <Card className="bg-background/40 text-xs text-muted-foreground">
            No documents in the queue. KYC submissions will appear here automatically.
          </Card>
        </Section>
      </div>
    </>
  );
}

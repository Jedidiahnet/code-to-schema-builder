import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  component: Help,
  head: () => ({ meta: [{ title: "Help · TradSig" }] }),
});

function Help() {
  return (
    <>
      <PageHeader title="Help Desk" subtitle="Open a ticket or browse docs." />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-8">
        <Section title="Open a ticket">
          <p className="text-xs text-muted-foreground">Use the messaging center for real-time support.</p>
          <Link to="/messages" className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">Go to messages →</Link>
        </Section>
        <Section title="Knowledge base">
          <ul className="space-y-1 text-xs">
            {["Connecting a webhook to MT5","Verifying Myfxbook performance","Understanding the 12-bot consensus","Refund policy"].map(t => (
              <li key={t} className="rounded border border-border/60 bg-background/40 p-2 hover:border-primary/60"><a href="#">{t}</a></li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

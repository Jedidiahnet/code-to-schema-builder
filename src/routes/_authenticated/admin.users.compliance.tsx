import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/users/compliance")({
  component: Comp,
  head: () => ({ meta: [{ title: "KYC Queue · Admin" }] }),
});

function Comp() {
  const [note, setNote] = useState("");
  return (
    <>
      <PageHeader title="KYC & Compliance Queue" subtitle="Review uploads, run sanctions checks, approve / reject." />
      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-8">
        <Section title="Pending review (3)">
          <ul className="space-y-2 text-xs">
            {["alex@x · Passport", "kane@x · ID + POA", "lin@x · Resubmit"].map((t, i) => (
              <li key={i} className="rounded border border-border/60 bg-background/40 p-2">{t}</li>
            ))}
          </ul>
        </Section>
        <Card className="lg:col-span-2">
          <div className="grid h-72 place-items-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
            Document preview (zoomable carousel)
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="bg-bull text-bull-foreground hover:bg-bull/90">Approve</Button>
            <Button size="sm" variant="outline">Resubmit</Button>
            <Button size="sm" variant="destructive">Reject (fraud)</Button>
            <Button size="sm" variant="outline">Run PEP / Sanctions</Button>
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rejection reason (markdown)…" className="mt-3" rows={4} />
        </Card>
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/support/tickets")({
  component: Tickets,
  head: () => ({ meta: [{ title: "Tickets · Admin" }] }),
});

const TICKETS = Array.from({ length: 8 }).map((_, i) => ({
  id: `TKT-${100 + i}`,
  user: `user${i + 1}@trad.sig`,
  topic: ["Billing", "Signal Bug", "Feature Request"][i % 3],
  priority: (["low","medium","urgent","critical"] as const)[i % 4],
  last: `${(i + 1) * 7}m ago`,
}));

function Tickets() {
  const [active, setActive] = useState(TICKETS[0]);
  const [reply, setReply] = useState("");
  return (
    <>
      <PageHeader title="Support Tickets" subtitle="Direct chat, internal notes, macros & priority routing." />
      <div className="grid gap-4 p-4 lg:grid-cols-12 lg:p-8">
        <Card className="lg:col-span-4 p-0">
          <ul>{TICKETS.map(t => (
            <li key={t.id}>
              <button onClick={() => setActive(t)} className={`block w-full px-3 py-2 text-left text-xs ${active.id === t.id ? "bg-primary/10" : ""}`}>
                <div className="flex justify-between"><span className="font-mono text-primary">{t.id}</span><span className="text-muted-foreground">{t.last}</span></div>
                <div>{t.user}</div>
                <div className="text-muted-foreground">{t.topic} · <span className={t.priority === "critical" ? "text-bear" : t.priority === "urgent" ? "text-warn" : ""}>{t.priority}</span></div>
              </button>
            </li>
          ))}</ul>
        </Card>
        <div className="lg:col-span-5 space-y-3">
          <Section title={`Chat — ${active.id}`}>
            <div className="h-64 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-background/40 p-3 text-xs">
              <div className="rounded bg-muted/40 p-2"><b>{active.user}:</b> My EUR/USD alert didn't fire.</div>
              <div className="text-right"><div className="inline-block rounded bg-primary/20 p-2"><b>You:</b> Looking into it now.</div></div>
            </div>
            <div className="mt-2 flex gap-2"><Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" /><Button>Send</Button></div>
            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">{["Refund issued","Bug logged","Closed"].map(m => <Button key={m} size="sm" variant="outline" className="h-6">{m}</Button>)}</div>
          </Section>
        </div>
        <Section title="Internal notes" >
          <Textarea placeholder="Private note for the team…" rows={8} />
        </Section>
      </div>
    </>
  );
}

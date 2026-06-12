import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support/broadcast")({
  component: Broadcast,
  head: () => ({ meta: [{ title: "Broadcast · Admin" }] }),
});

function Broadcast() {
  const [msg, setMsg] = useState("");
  const [audience, setAudience] = useState("all");
  const [level, setLevel] = useState("info");
  return (
    <>
      <PageHeader title="System Broadcast" subtitle="Send a banner or push to your users." />
      <div className="p-4 lg:p-8">
        <Section title="Compose message">
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} placeholder="e.g. Scheduled maintenance Sunday 02:00 UTC." />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select value={audience} onValueChange={setAudience}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">All users</SelectItem><SelectItem value="paid">Paid subscribers</SelectItem><SelectItem value="free">Free tier</SelectItem>
            </SelectContent></Select>
            <Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="info">Info</SelectItem><SelectItem value="warn">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem>
            </SelectContent></Select>
          </div>
          <Button className="mt-3 w-full" disabled={!msg.trim()} onClick={() => toast("Broadcast dispatch endpoint coming soon — message saved as draft.")}>Publish</Button>
        </Section>
      </div>
    </>
  );
}

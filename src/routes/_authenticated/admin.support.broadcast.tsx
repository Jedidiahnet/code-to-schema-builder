import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/support/broadcast")({
  component: Broadcast,
  head: () => ({ meta: [{ title: "Broadcast · Admin" }] }),
});

function Broadcast() {
  return (
    <>
      <PageHeader title="System Broadcast Center" subtitle="Push in-app banners and Telegram/Discord notifications." />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-8">
        <Section title="In-app banner">
          <Textarea placeholder="⚠️ Expect high volatility during today's US NFP Release" rows={4} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">All users</SelectItem><SelectItem value="free">Free tier</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="eurusd">EUR/USD traders</SelectItem>
            </SelectContent></Select>
            <Select defaultValue="info"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="info">Info</SelectItem><SelectItem value="warn">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem>
            </SelectContent></Select>
          </div>
          <Button className="mt-3 w-full">Publish banner</Button>
        </Section>
        <Section title="Push notification">
          <Textarea placeholder="Notification body…" rows={4} />
          <div className="mt-3 flex flex-wrap gap-2">
            {["In-app","Telegram","Discord","Browser"].map(ch => (
              <label key={ch} className="flex items-center gap-1 text-xs"><input type="checkbox" defaultChecked /> {ch}</label>
            ))}
          </div>
          <Button className="mt-3 w-full" variant="secondary">Dispatch</Button>
        </Section>
      </div>
    </>
  );
}

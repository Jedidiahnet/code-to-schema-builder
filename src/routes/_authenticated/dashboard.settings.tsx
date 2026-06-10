import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: Sec,
  head: () => ({ meta: [{ title: "Security · TradSig" }] }),
});

function Sec() {
  return (
    <>
      <PageHeader title="Security & Notifications" subtitle="2FA, active sessions and per-pair notification routing." />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-8">
        <Section title="Two-factor authentication">
          <div className="flex items-center justify-between text-sm"><span>Google Authenticator (TOTP)</span><Switch /></div>
          <div className="mt-2 flex items-center justify-between text-sm"><span>SMS verification</span><Switch /></div>
        </Section>
        <Section title="Active sessions">
          <ul className="space-y-1 text-xs">
            {["This device · Chrome / macOS","iOS · Safari","192.168.1.40 · Firefox"].map((s, i) => (
              <li key={i} className="flex items-center justify-between rounded border border-border/60 p-2"><span>{s}</span><Button size="sm" variant="outline">Revoke</Button></li>
            ))}
          </ul>
        </Section>
        <Section title="Notification routing">
          {["EUR/USD","GBP/USD","XAU/USD"].map(p => (
            <div key={p} className="flex items-center justify-between border-t border-border/40 py-2 text-xs first:border-0">
              <span>{p}</span>
              <div className="flex gap-3">{["Email","Telegram","Push"].map(c => <label key={c} className="flex items-center gap-1"><input type="checkbox" defaultChecked />{c}</label>)}</div>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

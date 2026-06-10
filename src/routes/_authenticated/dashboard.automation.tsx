import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/automation")({
  component: Auto,
  head: () => ({ meta: [{ title: "Automation · TradSig" }] }),
});

function Auto() {
  const [url] = useState("https://tradisig.lovable.app/api/public/webhook/u_abc123");
  const [payload, setPayload] = useState(`{\n  "pair": "{{pair}}",\n  "side": "{{dir}}",\n  "entry": "{{entry}}",\n  "tp": "{{tp}}",\n  "sl": "{{sl}}"\n}`);
  return (
    <>
      <PageHeader title="Webhook Hub" subtitle="Pipe signals into MT4/MT5, TradingView, Telegram and Discord." />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-8">
        <Section title="Your webhook URL">
          <div className="flex gap-2"><Input value={url} readOnly /><Button onClick={() => navigator.clipboard.writeText(url)}>Copy</Button></div>
          <Button size="sm" variant="outline" className="mt-3">Send test ping</Button>
        </Section>
        <Section title="JSON payload">
          <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={10} className="font-mono text-xs" />
        </Section>
        <Section title="Discord">
          <Input placeholder="Discord webhook URL" /><Button className="mt-2 w-full" size="sm">Connect</Button>
        </Section>
        <Section title="Telegram">
          <Input placeholder="Telegram chat ID" /><Button className="mt-2 w-full" size="sm">Connect</Button>
        </Section>
      </div>
    </>
  );
}

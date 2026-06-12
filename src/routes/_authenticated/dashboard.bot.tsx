import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Card, Section, Stat } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMyBot, upsertMyBot, deleteMyBot } from "@/lib/user-bots.functions";

export const Route = createFileRoute("/_authenticated/dashboard/bot")({
  component: BotPage,
  head: () => ({ meta: [{ title: "Telegram Bot · TradSig" }] }),
});

function BotPage() {
  const getFn = useServerFn(getMyBot);
  const saveFn = useServerFn(upsertMyBot);
  const delFn = useServerFn(deleteMyBot);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-bot"], queryFn: () => getFn() });

  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState(15);
  const [period, setPeriod] = useState(30);
  const [currency, setCurrency] = useState("USD");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (q.data?.bot) {
      setName(q.data.bot.display_name ?? "");
      setPrice(Math.round(q.data.bot.price_cents / 100));
      setPeriod(q.data.bot.period_days);
      setCurrency(q.data.bot.currency ?? "USD");
      setEnabled(q.data.bot.enabled);
    }
  }, [q.data?.bot]);

  const saveM = useMutation({
    mutationFn: () => saveFn({ data: {
      bot_token: token || (q.data?.bot ? "__keep__" : ""),
      display_name: name || null,
      price_cents: Math.round(price * 100),
      period_days: period,
      currency,
      enabled,
    } }),
    onSuccess: () => { toast.success("Bot saved"); setToken(""); qc.invalidateQueries({ queryKey: ["my-bot"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const delM = useMutation({
    mutationFn: () => delFn(),
    onSuccess: () => { toast.success("Bot removed"); qc.invalidateQueries({ queryKey: ["my-bot"] }); },
  });

  if (q.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const access = q.data?.access;
  if (access && !access.allowed) {
    return (
      <>
        <PageHeader title="Telegram Bot" subtitle="Run your own paid Telegram trading bot." />
        <div className="p-4 lg:p-8">
          <Card className="bg-background/40">
            <h2 className="font-display text-lg text-warn">Upgrade required</h2>
            <p className="mt-2 text-sm text-muted-foreground">{access.reason}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
              <Card className="bg-background/60"><div className="font-display text-sm">Pro</div><p className="mt-1 text-muted-foreground">Bot enabled · <span className="text-warn">8% revenue share</span> on every subscriber payment.</p></Card>
              <Card className="bg-background/60 border-accent/40"><div className="font-display text-sm text-accent">Elite</div><p className="mt-1 text-muted-foreground">Bot enabled · keep 100% of subscriber payments.</p></Card>
              <Card className="bg-background/60 border-primary/50"><div className="font-display text-sm text-primary">Quantum</div><p className="mt-1 text-muted-foreground">Bot enabled · keep 100% · senior council audits every signal.</p></Card>
            </div>
            <Link to="/pricing" className="mt-4 inline-block rounded-md border border-primary/60 px-3 py-1.5 text-xs text-primary hover:bg-primary/10">View pricing →</Link>
          </Card>
        </div>
      </>
    );
  }

  const earnings = q.data?.earnings ?? { gross: 0, payout: 0, fee: 0, activeSubs: 0 };
  const revshare = access?.allowed ? access.revsharePct : 0;

  return (
    <>
      <PageHeader title="Telegram Bot" subtitle="Connect your bot, set a subscription price and let Genius AI deliver signals to your subscribers." />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Active subscribers" value={earnings.activeSubs} tone="bull" />
          <Stat label="Gross earnings" value={`$${(earnings.gross / 100).toFixed(2)}`} tone="primary" />
          <Stat label="Your payout" value={`$${(earnings.payout / 100).toFixed(2)}`} tone="accent" />
          <Stat label="Platform fee" value={`$${(earnings.fee / 100).toFixed(2)} (${revshare}%)`} tone="warn" />
        </div>

        <Section title="Bot configuration">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Bot token (from @BotFather)</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder={q.data?.bot ? "•••••• (leave blank to keep current)" : "123456:ABC-DEF…"} className="font-mono text-xs" />
              <p className="mt-1 text-[10px] text-muted-foreground">Stored encrypted at rest. Only used to deliver signals to your subscribers.</p>
            </div>
            <div>
              <Label className="text-xs">Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Forex Edge" />
              {q.data?.bot?.bot_username && (
                <p className="mt-1 text-[10px] text-muted-foreground">Linked: <span className="font-mono">@{q.data.bot.bot_username}</span></p>
              )}
            </div>
            <div>
              <Label className="text-xs">Subscription price</Label>
              <div className="flex gap-2">
                <Input type="number" min={0} step={0.5} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className="w-20" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Billing period (days)</Label>
              <Input type="number" min={1} max={365} value={period} onChange={(e) => setPeriod(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <span className="text-xs">{enabled ? "Bot is live & accepting subscribers" : "Bot is paused"}</span>
            </div>
            <div className="flex items-end justify-end gap-2">
              {q.data?.bot && (
                <Button variant="outline" size="sm" onClick={() => { if (confirm("Disconnect this bot?")) delM.mutate(); }}>Disconnect</Button>
              )}
              <Button size="sm" disabled={saveM.isPending || (!q.data?.bot && !token.trim())} onClick={() => saveM.mutate()}>
                {saveM.isPending ? "Saving…" : q.data?.bot ? "Update bot" : "Connect bot"}
              </Button>
            </div>
          </div>
          {revshare > 0 && (
            <p className="mt-3 rounded border border-warn/30 bg-warn/5 p-2 text-[11px] text-warn">
              You're on the Pro plan — TradSig deducts {revshare}% from every successful subscriber payment. Upgrade to Elite or Quantum to keep 100%.
            </p>
          )}
        </Section>

        <Section title="Recent subscriber activity">
          {q.data?.subscribers?.length ? (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground"><tr><th className="p-2 text-left">When</th><th className="p-2 text-left">Status</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Your payout</th><th className="p-2 text-right">Fee</th></tr></thead>
              <tbody>{q.data.subscribers.map((s) => (
                <tr key={s.id} className="border-t border-border/40">
                  <td className="p-2 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="p-2 capitalize">{s.status}</td>
                  <td className="p-2 text-right">${(s.paid_cents / 100).toFixed(2)}</td>
                  <td className="p-2 text-right text-bull">${(s.owner_payout_cents / 100).toFixed(2)}</td>
                  <td className="p-2 text-right text-warn">${(s.platform_fee_cents / 100).toFixed(2)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : (
            <Card className="bg-background/40 text-xs text-muted-foreground">
              No subscribers yet. Share <span className="font-mono text-foreground">@{q.data?.bot?.bot_username ?? "yourbot"}</span> and tell users to send /start to subscribe.
            </Card>
          )}
        </Section>
      </div>
    </>
  );
}

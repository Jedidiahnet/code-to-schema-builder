import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { listMyWithdrawals, requestWithdrawal } from "@/lib/withdrawals.functions";
import { PageHeader, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, CreditCard, Smartphone, Bitcoin, Banknote, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/withdraw")({
  component: WithdrawPage,
  head: () => ({ meta: [{ title: "Withdraw · TradSig" }] }),
});

const METHODS = [
  { id: "paypal", label: "PayPal", icon: DollarSign, fields: [{ key: "email", label: "PayPal email", type: "email" }] },
  { id: "bank", label: "Bank Transfer", icon: Banknote, fields: [
    { key: "account_name", label: "Account name" },
    { key: "iban_or_account", label: "IBAN / Account #" },
    { key: "bank_name", label: "Bank name" },
    { key: "swift", label: "SWIFT / Routing" },
  ] },
  { id: "card", label: "Card (Visa)", icon: CreditCard, fields: [
    { key: "card_holder", label: "Card holder" },
    { key: "card_last4", label: "Card last 4 digits" },
  ] },
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone, fields: [
    { key: "provider", label: "Provider (MTN, Airtel…)" },
    { key: "phone", label: "Phone number" },
  ] },
  { id: "cashapp", label: "Cash App", icon: DollarSign, fields: [{ key: "cashtag", label: "$Cashtag" }] },
  { id: "crypto", label: "Crypto", icon: Bitcoin, fields: [
    { key: "asset", label: "Asset (BTC, ETH, USDT…)" },
    { key: "network", label: "Network (e.g. ERC20)" },
    { key: "address", label: "Wallet address" },
  ] },
] as const;

function WithdrawPage() {
  const listFn = useServerFn(listMyWithdrawals);
  const submitFn = useServerFn(requestWithdrawal);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["withdrawals"], queryFn: () => listFn() });

  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("paypal");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [destination, setDestination] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: (vars: Parameters<typeof submitFn>[0]) => submitFn(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      setAmount(""); setNotes(""); setDestination({});
      setOk("Withdrawal request submitted. Our team will review it shortly.");
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });

  const active = METHODS.find((x) => x.id === method)!;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents < 500) { setErr("Minimum withdrawal is $5.00"); return; }
    for (const f of active.fields) {
      if (!destination[f.key]?.trim()) { setErr(`Please fill ${f.label}`); return; }
    }
    m.mutate({ data: { amount_cents: cents, currency: "USD", method, destination, notes: notes || undefined } });
  }

  return (
    <>
      <PageHeader title="Withdraw earnings" subtitle="Cash out your trading profits and bot subscription revenue." />
      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-8">
        <div className="lg:col-span-2"><Section title="New request">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {METHODS.map((opt) => {
                const Icon = opt.icon;
                const selected = method === opt.id;
                return (
                  <button key={opt.id} type="button" onClick={() => { setMethod(opt.id); setDestination({}); }}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs transition ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card/40 text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="h-4 w-4" /> {opt.label}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Amount (USD)</label>
              <Input type="number" min="5" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" required />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {active.fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  <Input
                    type={("type" in f && f.type) || "text"}
                    value={destination[f.key] ?? ""}
                    onChange={(e) => setDestination((d) => ({ ...d, [f.key]: e.target.value }))}
                    required
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
            </div>

            {err && <p className="text-xs text-bear">{err}</p>}
            {ok && <p className="text-xs text-bull">{ok}</p>}

            <Button type="submit" disabled={m.isPending}>{m.isPending ? "Submitting…" : "Request withdrawal"}</Button>
          </form>
        </Section></div>

        <Section title="History">
          {q.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {q.data?.withdrawals.length === 0 && (
            <div className="rounded-xl border border-border bg-card/40 p-6 text-center">
              <Wallet className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">No withdrawals yet.</p>
            </div>
          )}
          <ul className="space-y-2">
            {q.data?.withdrawals.map((w) => (
              <li key={w.id} className="rounded-lg border border-border bg-card/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-foreground">${(w.amount_cents / 100).toFixed(2)} {w.currency}</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${w.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : w.status === "rejected" ? "bg-bear/20 text-bear" : "bg-muted text-muted-foreground"}`}>{w.status}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{w.method.replace("_", " ")} · {new Date(w.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

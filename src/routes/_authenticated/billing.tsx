import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getMyPlan, getMyPayments } from "@/lib/subscription.functions";
import { startCryptoCheckout } from "@/lib/crypto.functions";
import { PLANS, planLabel, type PlanTier } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
  head: () => ({ meta: [{ title: "Billing · Genius AI" }] }),
});

function BillingPage() {
  const fetchPlan = useServerFn(getMyPlan);
  const fetchPayments = useServerFn(getMyPayments);
  const startCheckout = useServerFn(startPaystackCheckout);
  const qc = useQueryClient();

  const planQ = useQuery({ queryKey: ["my-plan"], queryFn: () => fetchPlan() });
  const payQ = useQuery({ queryKey: ["my-payments"], queryFn: () => fetchPayments() });

  // Refresh after Paystack redirects back.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("paystack") === "success") {
      toast.success("Payment received. Activating your plan...");
      url.searchParams.delete("paystack");
      window.history.replaceState({}, "", url.toString());
      // Webhook may take a moment; poll a few times.
      let tries = 0;
      const t = setInterval(() => {
        qc.invalidateQueries({ queryKey: ["my-plan"] });
        qc.invalidateQueries({ queryKey: ["my-payments"] });
        if (++tries >= 5) clearInterval(t);
      }, 2000);
      return () => clearInterval(t);
    }
  }, [qc]);

  const checkoutMut = useMutation({
    mutationFn: (plan: PlanTier) => startCheckout({ data: { plan } }),
    onSuccess: (res) => {
      if (!res?.authorization_url) {
        toast.error("Payment provider did not return a checkout URL");
        return;
      }
      toast.success("Redirecting to Paystack…");
      window.location.href = res.authorization_url;
    },
    onError: (e: unknown) => {
      console.error("[billing] checkout failed", e);
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      toast.error(msg);
    },
  });

  const plan = planQ.data?.plan ?? null;
  const cfg = plan ? PLANS[plan] : null;
  const payments = Array.isArray(payQ.data) ? payQ.data : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-3xl text-glow">Billing</h1>

      <div className="mt-6 rounded-2xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
            <div className="mt-1 font-display text-2xl">{planLabel(plan)}</div>
            {cfg && (
              <div className="mt-1 text-xs text-muted-foreground">
                ${cfg.priceMonthly}/mo · {cfg.botCount} bots · {cfg.dailyAnalyses === "unlimited" ? "unlimited" : `${cfg.dailyAnalyses}/day`}
              </div>
            )}
            {planQ.data?.currentPeriodEnd && (
              <div className="mt-1 text-xs text-muted-foreground">
                Renews {new Date(planQ.data.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        {!plan && (
          <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-300">
            You don't have an active subscription. Pick a plan below to start running analyses.
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(["basic", "pro", "elite", "quantum"] as PlanTier[]).map((tier) => {
          const p = PLANS[tier];
          const isCurrent = plan === tier;
          return (
            <div
              key={tier}
              className={`rounded-2xl border bg-card/60 p-5 backdrop-blur ${
                p.highlight ? "border-primary/60" : "border-border"
              }`}
            >
              <h2 className="font-display text-xl">{p.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl">${p.priceMonthly}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              <div className="text-[11px] text-muted-foreground">GHS {p.priceGhsMonthly} via Paystack</div>
              <Button
                className="mt-4 w-full"
                variant={p.highlight ? "default" : "outline"}
                disabled={isCurrent || checkoutMut.isPending}
                onClick={() => checkoutMut.mutate(tier)}
              >
                {isCurrent ? "Current plan" : checkoutMut.isPending ? "Redirecting..." : `Subscribe · GHS ${p.priceGhsMonthly}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card/60 p-6">
        <h2 className="font-display text-lg">Payment history</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Plan</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-2">{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</td>
                  <td className="p-2 capitalize">{p.plan ?? "—"}</td>
                  <td className="p-2">{(p.amount_cents / 100).toFixed(2)} {p.currency}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2 font-mono text-[11px] text-muted-foreground">{p.paystack_reference ?? "—"}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          <Link to="/pricing" className="underline">Back to pricing overview</Link>
        </p>
      </div>
    </main>
  );
}

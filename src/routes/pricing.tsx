import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanTier } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing · Genius AI" },
      { name: "description", content: "Choose a plan: Basic, Pro, or Elite. Real-time multi-agent trading signals." },
    ],
  }),
});

function PricingPage() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onChoose = (_tier: PlanTier) => {
    if (signedIn === null) return; // still loading session
    if (signedIn) navigate({ to: "/billing" });
    else navigate({ to: "/signup" });
  };

  return (
    <div className="min-h-screen gradient-radial">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display tracking-widest text-glow">GENIUS AI</span>
        </Link>
        <Link to={signedIn ? "/dashboard" : "/login"} className="text-xs text-muted-foreground hover:text-foreground">
          {signedIn ? "Dashboard" : "Sign in"}
        </Link>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl text-glow md:text-5xl">Choose your plan</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            All plans include real Tiingo forex candles. Upgrade any time.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(["basic", "pro", "elite", "quantum"] as PlanTier[]).map((tier) => {
            const p = PLANS[tier];
            return (
              <div
                key={tier}
                className={`rounded-2xl border bg-card/60 p-6 backdrop-blur ${
                  p.highlight ? "border-primary/60 shadow-[0_0_40px_-15px_hsl(var(--primary))]" : "border-border"
                }`}
              >
                {p.highlight && (
                  <div className="mb-2 inline-block rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                    Most Popular
                  </div>
                )}
                <h2 className="font-display text-2xl">{p.name}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl">${p.priceMonthly}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <div className="text-[11px] text-muted-foreground">≈ GHS {p.priceGhsMonthly} via Paystack</div>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-bull" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={() => onChoose(tier)} className="mt-6 w-full" variant={p.highlight ? "default" : "outline"}>
                  {signedIn ? "Choose plan" : "Get started"}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
          Trading carries significant risk. Signals are AI-generated and not financial advice.
        </p>
      </main>
    </div>
  );
}

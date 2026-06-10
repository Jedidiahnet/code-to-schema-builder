import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useState } from "react";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Copy, Check } from "lucide-react";

const requireAdmin = async (userId: string) => {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!data?.some((r) => r.role === "admin")) throw new Error("Admin access required");
};

export const listPaymentProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("admin_payment_providers")
      .select("provider,display_name,enabled,public_config,notes,updated_at")
      .order("display_name");
    return data ?? [];
  });

const toggleInput = z.object({ provider: z.string().min(1).max(50), enabled: z.boolean() });
export const togglePaymentProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("admin_payment_providers")
      .update({ enabled: data.enabled })
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const notesInput = z.object({ provider: z.string().min(1).max(50), notes: z.string().max(2000) });
export const updateProviderNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => notesInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("admin_payment_providers")
      .update({ notes: data.notes })
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Returns the platform URLs admins need to configure providers.
export const getPlatformUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const base = "https://tradegeniusig.lovable.app";
    return {
      origin: base,
      paystackWebhook: `${base}/api/public/paystack.webhook`,
      paystackCallback: `${base}/billing?paystack=success`,
      stripeWebhook: `${base}/api/public/stripe.webhook`,
      paypalWebhook: `${base}/api/public/paypal.webhook`,
      cryptoWebhook: `${base}/api/public/crypto.webhook`,
      lemonsqueezyWebhook: `${base}/api/public/lemonsqueezy.webhook`,
    };
  });

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
  head: () => ({ meta: [{ title: "Settings · Admin" }] }),
});

type Provider = { provider: string; display_name: string; enabled: boolean; notes: string | null };

function AdminSettingsPage() {
  const listFn = useServerFn(listPaymentProviders);
  const toggleFn = useServerFn(togglePaymentProvider);
  const notesFn = useServerFn(updateProviderNotes);
  const urlsFn = useServerFn(getPlatformUrls);
  const qc = useQueryClient();

  const provQ = useQuery({ queryKey: ["payment-providers"], queryFn: () => listFn() });
  const urlsQ = useQuery({ queryKey: ["platform-urls"], queryFn: () => urlsFn() });

  const toggleMut = useMutation({
    mutationFn: (v: { provider: string; enabled: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-providers"] }),
  });
  const notesMut = useMutation({
    mutationFn: (v: { provider: string; notes: string }) => notesFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-providers"] }),
  });

  if (provQ.error) return <main className="mx-auto max-w-4xl px-6 py-8 text-bear">Access denied.</main>;
  const providers = (provQ.data ?? []) as Provider[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl text-glow">Admin Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground"><Link className="text-primary underline" to="/admin">Back to admin</Link></p>
      </div>

      <section className="rounded-2xl border border-border bg-card/60 p-5">
        <h2 className="font-display text-xl">Platform URLs</h2>
        <p className="mt-1 text-xs text-muted-foreground">Paste these into your payment provider dashboards.</p>
        <div className="mt-4 grid gap-2">
          <UrlRow label="Paystack webhook" value={urlsQ.data?.paystackWebhook} />
          <UrlRow label="Paystack live callback URL" value={urlsQ.data?.paystackCallback} />
          <UrlRow label="Stripe webhook (when wired)" value={urlsQ.data?.stripeWebhook} />
          <UrlRow label="PayPal webhook (when wired)" value={urlsQ.data?.paypalWebhook} />
          <UrlRow label="Crypto (NOWPayments) webhook" value={urlsQ.data?.cryptoWebhook} />
          <UrlRow label="Lemon Squeezy webhook" value={urlsQ.data?.lemonsqueezyWebhook} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/60 p-5">
        <h2 className="font-display text-xl">Payment Providers</h2>
        <p className="mt-1 text-xs text-muted-foreground">Toggle providers on. Paystack is live; others are scaffolds — secrets are managed in Cloud → Secrets.</p>
        <div className="mt-4 divide-y divide-border">
          {providers.map((p) => (
            <ProviderRow
              key={p.provider}
              provider={p}
              onToggle={(enabled) => toggleMut.mutate({ provider: p.provider, enabled })}
              onSaveNotes={(notes) => notesMut.mutate({ provider: p.provider, notes })}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/60 p-5">
        <h2 className="font-display text-xl">API Keys & Secrets</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          To rotate <span className="font-mono text-foreground">PAYSTACK_SECRET_KEY</span> or add new keys (Stripe, PayPal, Crypto, Lemon Squeezy),
          open <strong>Cloud → Secrets</strong>. Keys are stored encrypted and exposed only to server functions.
        </p>
        <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground space-y-1">
          <li><span className="font-mono text-foreground">PAYSTACK_SECRET_KEY</span> — Paystack live secret</li>
          <li><span className="font-mono text-foreground">PAYSTACK_PUBLIC_KEY</span> — Paystack public key (safe to embed)</li>
          <li><span className="font-mono text-foreground">STRIPE_SECRET_KEY</span> — required to enable Stripe checkout</li>
          <li><span className="font-mono text-foreground">PAYPAL_CLIENT_ID</span> / <span className="font-mono text-foreground">PAYPAL_SECRET</span> — required to enable PayPal</li>
          <li><span className="font-mono text-foreground">NOWPAYMENTS_API_KEY</span> — required to enable crypto checkout</li>
          <li><span className="font-mono text-foreground">LEMONSQUEEZY_API_KEY</span> — required to enable Lemon Squeezy</li>
        </ul>
      </section>
    </main>
  );
}

function UrlRow({ label, value }: { label: string; value: string | undefined }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="w-56 shrink-0 text-xs text-muted-foreground">{label}</div>
      <Input readOnly value={value ?? ""} className="font-mono text-xs" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (!value) return;
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function ProviderRow({ provider, onToggle, onSaveNotes }: {
  provider: Provider;
  onToggle: (enabled: boolean) => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(provider.notes ?? "");
  return (
    <div className="py-4 grid gap-2 md:grid-cols-[200px_1fr_auto] items-start">
      <div>
        <div className="font-display text-base">{provider.display_name}</div>
        <div className="text-[11px] font-mono text-muted-foreground">{provider.provider}</div>
      </div>
      <div className="flex-1">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (e.g. account name, instructions)" />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onSaveNotes(notes)}>Save</Button>
        <Switch checked={provider.enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

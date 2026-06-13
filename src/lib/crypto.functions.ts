import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, type PlanTier } from "./plans";

export const startCryptoCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: PlanTier }) =>
    z.object({ plan: z.enum(["basic", "pro", "elite", "quantum"]) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { nowpaymentsCreateInvoice } = await import("./crypto.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email").eq("id", userId).maybeSingle();
    if (!profile?.email) throw new Error("No email on your account.");

    const cfg = PLANS[data.plan];
    const reference = `cx_${data.plan}_${userId.slice(0, 8)}_${Date.now()}`;

    let origin = "https://tradisig.lovable.app";
    try { const host = getRequestHost(); if (host) origin = `https://${host}`; } catch {}

    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      paystack_reference: reference, // reusing the column as a generic reference
      amount_cents: Math.round(cfg.priceMonthly * 100),
      currency: "USD",
      status: "pending",
      plan: data.plan,
    });

    const invoice = await nowpaymentsCreateInvoice({
      amountUsd: cfg.priceMonthly,
      orderId: reference,
      orderDescription: `TradSig ${cfg.name} plan — ${userId.slice(0, 8)}`,
      ipnCallbackUrl: `${origin}/api/public/nowpayments.webhook`,
      successUrl: `${origin}/billing?crypto=success&ref=${reference}`,
      cancelUrl: `${origin}/billing?crypto=cancel`,
    });

    return { invoice_url: invoice.invoice_url, reference };
  });

export const cryptoProviderHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { nowpaymentsStatus } = await import("./crypto.server");
    return { ok: await nowpaymentsStatus() };
  });

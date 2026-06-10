import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, type PlanTier } from "./plans";
import { paystackInitTransaction } from "./paystack.server";

export const startPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: PlanTier }) =>
    z.object({ plan: z.enum(["basic", "pro", "elite", "quantum"]) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Use admin client so RLS / column grants on profiles never block the email lookup.
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) {
      console.error("[paystack] profile lookup failed", profileErr);
      throw new Error("Could not load your account email. Try again.");
    }
    if (!profile?.email) {
      throw new Error("No email on your account. Update your profile, then try again.");
    }

    const cfg = PLANS[data.plan];
    if (!cfg) throw new Error(`Unknown plan: ${data.plan}`);
    const reference = `gx_${data.plan}_${userId.slice(0, 8)}_${Date.now()}`;

    // Build callback URL from current request host so it works in preview + prod.
    let origin = "https://tradegeniusig.lovable.app";
    try {
      const host = getRequestHost();
      if (host) origin = `https://${host}`;
    } catch {}
    const callbackUrl = `${origin}/billing?paystack=success`;

    // Record a pending payment row so we can reconcile via webhook or callback.
    const { error: insErr } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      paystack_reference: reference,
      amount_cents: cfg.priceGhsMonthly * 100,
      currency: "GHS",
      status: "pending",
      plan: data.plan,
    });
    if (insErr) console.error("[paystack] payment insert failed", insErr);

    try {
      const init = await paystackInitTransaction({
        email: profile.email,
        amountGhs: cfg.priceGhsMonthly,
        reference,
        callbackUrl,
        metadata: { user_id: userId, plan: data.plan },
      });
      return { authorization_url: init.authorization_url, reference };
    } catch (e) {
      console.error("[paystack] init transaction failed", e);
      throw new Error(e instanceof Error ? e.message : "Payment provider rejected the request");
    }
  });

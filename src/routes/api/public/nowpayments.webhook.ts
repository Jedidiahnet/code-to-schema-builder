import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";

export const Route = createFileRoute("/api/public/nowpayments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get("x-nowpayments-sig") ?? "";

        const { getSecret } = await import("@/lib/secret-store.server");
        const ipnSecret = (await getSecret("NOWPAYMENTS_IPN_SECRET")) ?? process.env.NOWPAYMENTS_IPN_SECRET;
        if (!ipnSecret) return new Response("IPN secret not configured", { status: 500 });

        // NOWPayments signs the JSON body sorted by keys.
        let payload: Record<string, unknown>;
        try { payload = JSON.parse(body); } catch { return new Response("bad json", { status: 400 }); }
        const sorted = JSON.stringify(payload, Object.keys(payload).sort());
        const expected = crypto.createHmac("sha512", ipnSecret).update(sorted).digest("hex");
        if (sig !== expected) return new Response("invalid signature", { status: 401 });

        const status = String(payload.payment_status ?? "");
        const orderId = String(payload.order_id ?? "");
        if (!orderId) return new Response("missing order_id", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const map: Record<string, string> = {
          finished: "paid", confirmed: "paid", partially_paid: "paid",
          waiting: "pending", confirming: "pending", sending: "pending",
          failed: "failed", refunded: "refunded", expired: "expired",
        };
        const newStatus = map[status] ?? "pending";
        const { data: pay } = await supabaseAdmin
          .from("payments").update({ status: newStatus })
          .eq("paystack_reference", orderId).select("user_id,plan").maybeSingle();

        if (newStatus === "paid" && pay?.user_id && pay?.plan) {
          const { data: existing } = await supabaseAdmin
            .from("subscriptions").select("current_period_end").eq("user_id", pay.user_id).maybeSingle();
          const base = existing?.current_period_end && new Date(existing.current_period_end) > new Date()
            ? new Date(existing.current_period_end) : new Date();
          const next = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabaseAdmin.from("subscriptions").upsert({
            user_id: pay.user_id, plan: pay.plan, status: "active", current_period_end: next,
          }, { onConflict: "user_id" });
        }
        return new Response("ok");
      },
    },
  },
});

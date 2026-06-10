import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PlanTier } from "@/lib/plans";

export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        try {
          if (
            signature.length !== expected.length ||
            !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
          ) {
            return new Response("Invalid signature", { status: 401 });
          }
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body) as {
          event: string;
          data: {
            reference: string;
            status: string;
            amount: number;
            currency: string;
            paid_at?: string;
            metadata?: { user_id?: string; plan?: PlanTier };
            customer?: { email?: string };
          };
        };

        if (event.event !== "charge.success") {
          return new Response("ok");
        }

        const { reference, status, paid_at, metadata } = event.data;
        if (status !== "success") return new Response("ok");

        // Look up the pending payment for plan/user (fallback to metadata).
        const { data: pay } = await supabaseAdmin
          .from("payments")
          .select("id,user_id,plan")
          .eq("paystack_reference", reference)
          .maybeSingle();

        const userId = pay?.user_id ?? metadata?.user_id;
        const plan = (pay?.plan ?? metadata?.plan) as PlanTier | undefined;
        if (!userId || !plan) return new Response("Missing user/plan", { status: 400 });

        await supabaseAdmin
          .from("payments")
          .update({ status: "success", paid_at: paid_at ?? new Date().toISOString() })
          .eq("paystack_reference", reference);

        // Extend subscription by 30 days from now (or from existing period end if later).
        const { data: existing } = await supabaseAdmin
          .from("subscriptions")
          .select("current_period_end")
          .eq("user_id", userId)
          .maybeSingle();

        const base =
          existing?.current_period_end && new Date(existing.current_period_end).getTime() > Date.now()
            ? new Date(existing.current_period_end)
            : new Date();
        const newEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan,
              status: "active",
              current_period_end: newEnd,
              cancel_at_period_end: false,
            },
            { onConflict: "user_id" }
          );

        return new Response("ok");
      },
    },
  },
});

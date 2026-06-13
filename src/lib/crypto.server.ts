// Server-only NOWPayments wrapper. Crypto checkout (BTC/USDT/ETH/etc).
import { requireSecret } from "./secret-store.server";

const NP_BASE = "https://api.nowpayments.io/v1";

export type NPInvoice = {
  id: string;
  invoice_url: string;
  order_id: string;
  pay_address?: string;
  pay_currency?: string;
  price_amount: number;
  price_currency: string;
};

async function key() { return requireSecret("NOWPAYMENTS_API_KEY"); }

export async function nowpaymentsCreateInvoice(args: {
  amountUsd: number;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<NPInvoice> {
  const res = await fetch(`${NP_BASE}/invoice`, {
    method: "POST",
    headers: { "x-api-key": await key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: args.amountUsd,
      price_currency: "usd",
      order_id: args.orderId,
      order_description: args.orderDescription,
      ipn_callback_url: args.ipnCallbackUrl,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    }),
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`NOWPayments invoice failed: ${(json.message as string) || res.statusText}`);
  return json as unknown as NPInvoice;
}

export async function nowpaymentsGetPayment(paymentId: string): Promise<{ payment_status: string; order_id: string; price_amount: number; pay_currency: string }> {
  const res = await fetch(`${NP_BASE}/payment/${encodeURIComponent(paymentId)}`, { headers: { "x-api-key": await key() } });
  if (!res.ok) throw new Error(`NOWPayments status failed: HTTP ${res.status}`);
  return res.json();
}

export async function nowpaymentsStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${NP_BASE}/status`, { headers: { "x-api-key": await key() } });
    return res.ok;
  } catch { return false; }
}

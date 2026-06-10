// Server-only Paystack helpers. Never import from client code.
import { requireSecret } from "./secret-store.server";

const PAYSTACK_BASE = "https://api.paystack.co";

export type PaystackInitResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

async function getSecret(): Promise<string> {
  return requireSecret("PAYSTACK_SECRET_KEY");
}

export async function paystackInitTransaction(args: {
  email: string;
  amountGhs: number; // major units (e.g. 250 GHS)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: args.email,
      amount: Math.round(args.amountGhs * 100), // pesewas
      currency: "GHS",
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: args.metadata ?? {},
    }),
  });
  const json = (await res.json()) as { status: boolean; message: string; data?: PaystackInitResponse };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(`Paystack init failed: ${json.message || res.statusText}`);
  }
  return json.data;
}

export async function paystackVerifyTransaction(reference: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  customer: { email: string };
  metadata: Record<string, unknown> | null;
  paid_at: string | null;
}> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecret()}` },
  });
  const json = (await res.json()) as { status: boolean; message: string; data?: any };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(`Paystack verify failed: ${json.message || res.statusText}`);
  }
  return json.data;
}

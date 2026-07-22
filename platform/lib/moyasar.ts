import type { PlanId } from "./plans";
import { planById } from "./plans";

const MOYASAR_API = "https://api.moyasar.com/v1";

export function moyasarConfigured(): boolean {
  return Boolean(process.env.MOYASAR_SECRET_KEY);
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function authHeader(): string {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) throw new Error("MOYASAR_SECRET_KEY not configured");
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

export interface MoyasarPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

/** Create a hosted Moyasar invoice and return the checkout URL. */
export async function createCheckout(opts: {
  userId: string;
  plan: PlanId;
  email: string;
}): Promise<{ checkoutUrl: string; paymentId: string } | null> {
  const planDef = planById(opts.plan);
  if (!planDef || planDef.amountHalalas <= 0) return null;

  const body = {
    amount: planDef.amountHalalas,
    currency: "SAR",
    description: `New Riyadh Media — ${planDef.name} plan`,
    callback_url: `${appUrl()}/api/payments/callback`,
    success_url: `${appUrl()}/subscribe/success?plan=${opts.plan}`,
    metadata: {
      user_id: opts.userId,
      plan: opts.plan,
    },
  };

  const res = await fetch(`${MOYASAR_API}/invoices`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("[moyasar] invoice create failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as { id?: string; url?: string };
  if (!data.id || !data.url) return null;
  return { checkoutUrl: data.url, paymentId: data.id };
}

/** Verify a payment by ID with Moyasar (server-side, never trust client alone). */
export async function verifyPayment(paymentId: string): Promise<MoyasarPayment | null> {
  const res = await fetch(`${MOYASAR_API}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    console.error("[moyasar] verify failed:", res.status);
    return null;
  }
  return (await res.json()) as MoyasarPayment;
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createPayment, updateUser } from "@/lib/db";
import { creditsForPlan, planById } from "@/lib/plans";
import { createCheckout, moyasarConfigured } from "@/lib/moyasar";

export const runtime = "nodejs";

const Body = z.object({ plan: z.enum(["starter", "growth", "scale"]) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a plan." }, { status: 400 });

  const plan = parsed.data.plan;
  const planDef = planById(plan);
  if (!planDef) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  if (plan === "scale") {
    return NextResponse.json({ error: "Contact sales for the Scale plan." }, { status: 400 });
  }

  // Demo mode when Moyasar keys are absent (local dev).
  if (!moyasarConfigured()) {
    await updateUser(user.id, {
      subscribed: true,
      plan,
      credits: creditsForPlan(plan),
      subscribedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, demo: true });
  }

  const checkout = await createCheckout({ userId: user.id, plan, email: user.email });
  if (!checkout) {
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }

  await createPayment({
    id: crypto.randomUUID(),
    userId: user.id,
    plan,
    amount: planDef.amountHalalas,
    currency: "SAR",
    status: "pending",
    moyasarId: checkout.paymentId,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, checkoutUrl: checkout.checkoutUrl });
}

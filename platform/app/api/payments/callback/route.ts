import { NextResponse } from "next/server";
import { prisma, updateUser } from "@/lib/db";
import { creditsForPlan } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { moyasarConfigured, verifyPayment } from "@/lib/moyasar";

export const runtime = "nodejs";

/**
 * Moyasar redirects here after payment. We verify server-side before activating.
 * Query: ?id={payment_id}&status=paid
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("id");
  const status = searchParams.get("status");

  if (!paymentId) {
    return NextResponse.redirect(new URL("/subscribe?error=missing_payment", req.url));
  }

  if (!moyasarConfigured()) {
    return NextResponse.redirect(new URL("/subscribe?error=not_configured", req.url));
  }

  if (status !== "paid") {
    return NextResponse.redirect(new URL("/subscribe?error=payment_failed", req.url));
  }

  const verified = await verifyPayment(paymentId);
  if (!verified || verified.status !== "paid") {
    return NextResponse.redirect(new URL("/subscribe?error=verification_failed", req.url));
  }

  const userId = verified.metadata?.user_id;
  const plan = verified.metadata?.plan as PlanId | undefined;
  if (!userId || !plan || !["starter", "growth"].includes(plan)) {
    return NextResponse.redirect(new URL("/subscribe?error=invalid_metadata", req.url));
  }

  // Mark any pending payment record for this user as paid.
  await prisma.payment.updateMany({
    where: { userId, plan, status: "pending" },
    data: { status: "paid", paidAt: new Date().toISOString(), moyasarId: paymentId },
  });

  await updateUser(userId, {
    subscribed: true,
    plan,
    credits: creditsForPlan(plan),
    subscribedAt: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}

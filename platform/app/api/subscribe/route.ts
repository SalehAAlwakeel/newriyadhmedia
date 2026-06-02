import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({ plan: z.enum(["starter", "growth", "scale"]) });

// Mock checkout. In production this becomes a Stripe Checkout Session redirect,
// and the user is flipped to subscribed by a Stripe webhook — not here.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a plan." }, { status: 400 });

  await updateUser(user.id, { subscribed: true, plan: parsed.data.plan });
  return NextResponse.json({ ok: true });
}

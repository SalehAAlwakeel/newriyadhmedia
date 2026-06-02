import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true, subscribed: user.subscribed });
}

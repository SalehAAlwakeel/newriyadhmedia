import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createUser, findUserByEmail } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  company: z.string().max(160).optional().default(""),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in all fields. Password must be at least 8 characters." }, { status: 400 });
  }

  const { name, email, company, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = await createUser({
    id: crypto.randomUUID(),
    email,
    name,
    company,
    passwordHash: hashPassword(password),
    subscribed: false,
    plan: null,
    createdAt: new Date().toISOString(),
    connections: [],
    brandKit: null,
    contentPrefs: null,
  });

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true, subscribed: false });
}

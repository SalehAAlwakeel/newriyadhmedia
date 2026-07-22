import { NextResponse } from "next/server";
import { z } from "zod";
import { LOCALE_COOKIE } from "@/lib/i18n";

export const runtime = "nodejs";

const Body = z.object({ locale: z.enum(["en", "ar"]) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

  const res = NextResponse.json({ ok: true, locale: parsed.data.locale });
  res.cookies.set(LOCALE_COOKIE, parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}

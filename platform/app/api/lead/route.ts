import { NextResponse } from "next/server";
import { z } from "zod";
import { saveLead } from "@/lib/leads";
import { checkLimits, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const ResultSchema = z.object({
  profile: z.object({
    businessName: z.string(),
    elevatorPitch: z.string(),
    logoUrl: z.string().nullable(),
    detectedLanguage: z.string(),
    sourceUrl: z.string(),
  }),
  audience: z.object({ audience: z.string(), adFaces: z.string(), language: z.string() }),
  positioning: z.string(),
  strategyId: z.string(),
  campaign: z.object({
    name: z.string(),
    theme: z.string(),
    callToAction: z.string(),
    targetLink: z.string(),
  }),
  channels: z.array(z.string()),
  cadence: z.enum(["light", "steady", "aggressive"]),
  plan: z.object({
    weeks: z.array(
      z.object({ weekNumber: z.number(), name: z.string(), description: z.string() })
    ),
  }),
});

const Body = z.object({
  email: z.string().email().max(200),
  // result is validated loosely; the source of truth is the client's flow.
  result: ResultSchema,
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = await checkLimits(ip);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests — please try again shortly." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveLead(parsed.data.email, parsed.data.result as any);
  return NextResponse.json({ ok: true });
}

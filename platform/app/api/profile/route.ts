import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export const runtime = "nodejs";

// Permissive enough that adding a new field to the BrandKit / ContentPreferences
// types doesn't silently get dropped on the way to the database. We still cap
// string lengths and the per-week post count so the JSON store stays sane.
const BrandKitSchema = z
  .object({
    primaryColor: z.string().max(20),
    secondaryColor: z.string().max(20),
    logoUrl: z.string().max(500),
    voice: z.string().max(1200),
    fonts: z.string().max(200),
    purpose: z.string().max(1200).optional(),
    audience: z.string().max(1200).optional(),
    character: z.string().max(1200).optional(),
    toneTraits: z.array(z.string().max(80)).max(20).optional(),
    emotionTraits: z.array(z.string().max(80)).max(20).optional(),
  })
  .partial({
    purpose: true,
    audience: true,
    character: true,
    toneTraits: true,
    emotionTraits: true,
  });

const ContentPrefsSchema = z.object({
  languages: z.array(z.string().max(20)).max(5),
  tone: z.string().max(400),
  topics: z.string().max(1200),
  postsPerWeek: z.number().int().min(1).max(50),
  doNotMention: z.string().max(1200),
  mode: z.enum(["growth", "balanced", "brand-first", "strict"]).optional(),
  includeMusic: z.boolean().optional(),
  includeNarration: z.boolean().optional(),
  ctaCopy: z.string().max(400).optional(),
  ctaUrl: z.string().max(500).optional(),
  smartCaptions: z.boolean().optional(),
});

const Body = z.object({
  brandKit: BrandKitSchema.optional(),
  contentPrefs: ContentPrefsSchema.optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.brandKit) {
    patch.brandKit = { ...(user.brandKit ?? {}), ...parsed.data.brandKit };
  }
  if (parsed.data.contentPrefs) {
    patch.contentPrefs = { ...(user.contentPrefs ?? {}), ...parsed.data.contentPrefs };
  }

  await updateUser(user.id, patch);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({
    brandKit: user.brandKit ?? null,
    contentPrefs: user.contentPrefs ?? null,
  });
}

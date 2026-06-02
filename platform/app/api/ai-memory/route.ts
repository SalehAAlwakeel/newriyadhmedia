import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAiMemory, listAiMemory } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["fact", "preference", "do-not", "winning-pattern", "learning"]).optional().default("fact"),
  text: z.string().min(1).max(2000),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const memory = await listAiMemory(user.id);
  return NextResponse.json({ memory });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Tell the AI something it should remember." }, { status: 400 });

  const entry = await addAiMemory(user.id, {
    id: crypto.randomUUID(),
    kind: parsed.data.kind,
    text: parsed.data.text.trim(),
    source: "user",
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, entry });
}

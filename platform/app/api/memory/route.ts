import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAiMemory, deleteAiMemory, listAiMemory } from "@/lib/db";

export const runtime = "nodejs";

const PostBody = z.object({
  kind: z.enum(["fact", "preference", "do-not", "winning-pattern", "learning"]),
  text: z.string().min(1).max(600),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const memory = await listAiMemory(user.id);
  return NextResponse.json({ memory });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const entry = {
    id: crypto.randomUUID(),
    kind: parsed.data.kind,
    text: parsed.data.text.trim(),
    source: "user" as const,
    createdAt: new Date().toISOString(),
  };
  await addAiMemory(user.id, entry);
  const memory = await listAiMemory(user.id);
  return NextResponse.json({ ok: true, entry, memory });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  await deleteAiMemory(user.id, id);
  const memory = await listAiMemory(user.id);
  return NextResponse.json({ ok: true, memory });
}

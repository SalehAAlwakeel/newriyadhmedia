import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAiMemory, updateUser } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";

export const runtime = "nodejs";

const Body = z.object({ platform: z.string().min(1) });

// Pull fresh analytics from the connected account. Without a real provider
// app this simulates a sync — bumps the followers count by a small,
// stable amount and writes the result as an AI-memory entry so the
// strategist can reference the latest numbers.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const def = PLATFORMS.find((p) => p.id === parsed.data.platform);
  if (!def) return NextResponse.json({ error: "Unknown platform." }, { status: 400 });

  const conn = user.connections.find((c) => c.platform === def.id);
  if (!conn) return NextResponse.json({ error: "Account not connected." }, { status: 400 });

  const previous = conn.audienceSize ?? 0;
  const delta = Math.floor(previous * 0.012) + Math.floor(Math.random() * 40);
  const audienceSize = previous + delta;
  const now = new Date().toISOString();

  const connections = user.connections.map((c) =>
    c.platform === def.id ? { ...c, audienceSize, lastSyncedAt: now } : c,
  );

  await updateUser(user.id, { connections });

  await addAiMemory(user.id, {
    id: crypto.randomUUID(),
    kind: "learning",
    text: previous
      ? `${def.name} (${conn.handle}) audience is now ${audienceSize.toLocaleString()} (+${delta.toLocaleString()} since last sync).`
      : `${def.name} (${conn.handle}) baseline audience: ${audienceSize.toLocaleString()}.`,
    source: "analytics",
    createdAt: now,
  });

  return NextResponse.json({ ok: true, connection: connections.find((c) => c.platform === def.id) });
}

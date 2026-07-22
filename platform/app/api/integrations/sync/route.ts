import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAiMemory, updateUser } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";
import { isVerifiedConnection, publicConnection } from "@/lib/social";
import { syncInstagramMetrics } from "@/lib/instagram";

export const runtime = "nodejs";

const Body = z.object({ platform: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const def = PLATFORMS.find((p) => p.id === parsed.data.platform);
  if (!def) return NextResponse.json({ error: "Unknown platform." }, { status: 400 });

  const conn = user.connections.find((c) => c.platform === def.id);
  if (!conn || !isVerifiedConnection(conn)) {
    return NextResponse.json({ error: "Account not connected." }, { status: 400 });
  }

  const now = new Date().toISOString();
  let patch: Record<string, unknown> = { lastSyncedAt: now };

  if (def.id === "instagram") {
    try {
      patch = { ...(await syncInstagramMetrics(conn)), lastSyncedAt: now };
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not sync Instagram." },
        { status: 502 },
      );
    }
  } else {
    return NextResponse.json({ error: `${def.name} sync is not available yet.` }, { status: 400 });
  }

  const connections = user.connections.map((c) => (c.platform === def.id ? { ...c, ...patch } : c));
  await updateUser(user.id, { connections });

  const updated = connections.find((c) => c.platform === def.id);
  const audienceSize = typeof patch.audienceSize === "number" ? patch.audienceSize : conn.audienceSize ?? 0;

  await addAiMemory(user.id, {
    id: crypto.randomUUID(),
    kind: "learning",
    text: `${def.name} (${updated?.handle ?? conn.handle}) audience is now ${audienceSize.toLocaleString()}.`,
    source: "analytics",
    createdAt: now,
  });

  return NextResponse.json({ ok: true, connection: updated ? publicConnection(updated) : undefined });
}

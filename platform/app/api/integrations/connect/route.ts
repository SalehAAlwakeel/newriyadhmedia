import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateUser, addAiMemory, type ConnectionCapability } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";
import crypto from "crypto";

export const runtime = "nodejs";

const CAPS = ["publish", "stories", "analytics", "dms"] as const;

const Body = z.object({
  platform: z.string().min(1),
  handle: z.string().max(120).optional().default(""),
  providerAccountId: z.string().max(200).optional().default(""),
  avatarUrl: z.string().max(800).optional().default(""),
  audienceSize: z.number().int().min(0).max(10_000_000_000).optional(),
  capabilities: z.array(z.enum(CAPS)).max(8).optional(),
  accessToken: z.string().max(2000).optional(),
});

// In production each platform redirects through its OAuth consent screen and
// returns here via a callback. Until provider apps are registered, this
// records the connection from the in-app Connect modal so the rest of the
// product (scheduling, analytics, learning) is fully testable end-to-end.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const def = PLATFORMS.find((p) => p.id === parsed.data.platform);
  if (!def) return NextResponse.json({ error: "Unknown platform." }, { status: 400 });

  const previous = user.connections.find((c) => c.platform === def.id);
  const connections = user.connections.filter((c) => c.platform !== def.id);

  const caps: ConnectionCapability[] =
    (parsed.data.capabilities as ConnectionCapability[] | undefined) ??
    previous?.capabilities ?? ["publish", "analytics"];

  connections.push({
    platform: def.id,
    handle: parsed.data.handle || previous?.handle || def.sampleHandle,
    providerAccountId: parsed.data.providerAccountId || previous?.providerAccountId,
    avatarUrl: parsed.data.avatarUrl || previous?.avatarUrl,
    audienceSize:
      typeof parsed.data.audienceSize === "number" ? parsed.data.audienceSize : previous?.audienceSize,
    capabilities: caps,
    accessToken: parsed.data.accessToken || previous?.accessToken,
    connectedAt: previous?.connectedAt ?? new Date().toISOString(),
    lastSyncedAt: previous?.lastSyncedAt,
  });

  await updateUser(user.id, { connections });

  if (!previous) {
    await addAiMemory(user.id, {
      id: crypto.randomUUID(),
      kind: "fact",
      text: `Connected ${def.name} (${parsed.data.handle || def.sampleHandle}).`,
      source: "auto",
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, connections });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({ platform: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const connections = user.connections.filter((c) => c.platform !== parsed.data.platform);
  await updateUser(user.id, { connections });
  return NextResponse.json({ ok: true, connections });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteAiMemory } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteAiMemory(user.id, id);
  if (!ok) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

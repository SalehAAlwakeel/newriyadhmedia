import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { deleteMedia, getMedia } from "@/lib/db";

export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const existing = await getMedia(id);
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await deleteMedia(id);
  const dir = path.join(UPLOADS_DIR, user.id);
  try {
    const files = await fs.readdir(dir);
    const match = files.find((f) => f.startsWith(`${id}.`));
    if (match) await fs.unlink(path.join(dir, match));
  } catch {
    // ignore — the metadata is the source of truth
  }
  return NextResponse.json({ ok: true });
}

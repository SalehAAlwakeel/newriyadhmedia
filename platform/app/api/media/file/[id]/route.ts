import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { getMedia } from "@/lib/db";

export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const asset = await getMedia(id);
  if (!asset || asset.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const dir = path.join(UPLOADS_DIR, asset.userId);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return NextResponse.json({ error: "File missing on disk." }, { status: 410 });
  }
  const match = files.find((f) => f.startsWith(`${id}.`));
  if (!match) return NextResponse.json({ error: "File missing on disk." }, { status: 410 });

  const filePath = path.join(dir, match);
  const data = await fs.readFile(filePath);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": asset.mime || "application/octet-stream",
      "Content-Length": String(data.byteLength),
      "Cache-Control": "private, max-age=300",
    },
  });
}

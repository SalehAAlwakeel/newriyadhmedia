import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getMedia } from "@/lib/db";
import { verifyMediaPublicAccess } from "@/lib/mediaPublic";

export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

/** Public, signed media fetch for Instagram/Meta crawlers (no session required). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const exp = searchParams.get("exp");
  const sig = searchParams.get("sig");

  if (!verifyMediaPublicAccess(id, exp, sig)) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 403 });
  }

  const asset = await getMedia(id);
  if (!asset) return NextResponse.json({ error: "Not found." }, { status: 404 });

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
      "Cache-Control": "public, max-age=300",
    },
  });
}

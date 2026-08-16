import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { createMedia, listMedia, type MediaAsset } from "@/lib/db";

export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");
const MAX_BYTES = 50 * 1024 * 1024;

function kindOf(mime: string): MediaAsset["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

function extOf(mime: string, filename: string): string {
  const fromName = path.extname(filename).toLowerCase().replace(".", "");
  if (fromName) return fromName;
  const guess = mime.split("/")[1] ?? "bin";
  return guess.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "bin";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const media = await listMedia(user.id);
  return NextResponse.json({ media });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a file." }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "File is empty." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File is too large (max ${MAX_BYTES / 1024 / 1024} MB).` }, { status: 413 });
  }

  const id = crypto.randomUUID();
  const ext = extOf(file.type, file.name);
  const dir = path.join(UPLOADS_DIR, user.id);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.${ext}`);
  await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const asset: MediaAsset = {
    id,
    userId: user.id,
    filename: file.name || `${id}.${ext}`,
    mime: file.type || "application/octet-stream",
    sizeBytes: file.size,
    kind: kindOf(file.type),
    source: "upload",
    label: typeof form?.get("label") === "string" ? String(form.get("label")).slice(0, 40) : undefined,
    url: `/api/media/file/${id}`,
    uploadedAt: new Date().toISOString(),
  };
  await createMedia(asset);

  return NextResponse.json({ ok: true, asset });
}

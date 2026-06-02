import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { createMedia } from "./db";

// ---------------------------------------------------------------------------
// Persist AI-generated images as real files under .data/uploads/<userId>/<id>.<ext>
// and register a "generated" media asset. We store a /api/media/file/<id> URL on
// the post instead of an expiring provider URL or a giant base64 data URI — the
// latter is what previously bloated the database to ~20MB.
// ---------------------------------------------------------------------------

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

interface ImageSource {
  /** Base64 (no data: prefix) from the image API. */
  b64?: string;
  /** Remote URL (provider URL or data: URI). */
  url?: string;
  mime?: string;
}

function extForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "png";
}

async function bytesFromSource(src: ImageSource): Promise<{ bytes: Buffer; mime: string } | null> {
  try {
    if (src.b64) {
      return { bytes: Buffer.from(src.b64, "base64"), mime: src.mime || "image/png" };
    }
    if (src.url?.startsWith("data:")) {
      const match = src.url.match(/^data:([^;]+);base64,(.*)$/);
      if (match) return { bytes: Buffer.from(match[2], "base64"), mime: match[1] || "image/png" };
    }
    if (src.url) {
      const res = await fetch(src.url);
      if (!res.ok) return null;
      const mime = res.headers.get("content-type") || src.mime || "image/png";
      const bytes = Buffer.from(await res.arrayBuffer());
      return { bytes, mime };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Save one generated image and return its app URL (/api/media/file/<id>),
 * or null if it couldn't be persisted (caller should fall back to the raw URL).
 */
export async function persistGeneratedImage(
  userId: string,
  postId: string | undefined,
  src: ImageSource,
  label?: string,
): Promise<string | null> {
  const resolved = await bytesFromSource(src);
  if (!resolved) return null;

  const id = crypto.randomUUID();
  const ext = extForMime(resolved.mime);
  const dir = path.join(UPLOADS_DIR, userId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.${ext}`), resolved.bytes);

  const url = `/api/media/file/${id}`;
  await createMedia({
    id,
    userId,
    filename: `${label ?? "generated"}-${id}.${ext}`,
    mime: resolved.mime,
    sizeBytes: resolved.bytes.byteLength,
    kind: "image",
    source: "generated",
    label,
    url,
    uploadedAt: new Date().toISOString(),
    postId,
  });
  return url;
}

import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

/** Extract a media asset id from an app media URL, if present. */
export function mediaIdFromAppUrl(url: string): string | null {
  const m = url.match(/\/api\/media\/file\/([^/?#]+)/);
  return m?.[1] ?? null;
}

/** Time-limited public URL Meta/Instagram can fetch (no session cookie required). */
export function signMediaPublicUrl(mediaId: string, ttlSec = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = signPayload(`${mediaId}.${exp}`);
  return `/api/media/public/${encodeURIComponent(mediaId)}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

export function verifyMediaPublicAccess(mediaId: string, exp: string | null, sig: string | null): boolean {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
  const expected = signPayload(`${mediaId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

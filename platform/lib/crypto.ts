import crypto from "crypto";

// ---------------------------------------------------------------------------
// Symmetric encryption for secrets at rest (social OAuth/access tokens).
// AES-256-GCM with a key derived from TOKEN_ENC_KEY (falls back to AUTH_SECRET
// so dev still works, but set TOKEN_ENC_KEY in production). Values are tagged
// "enc:v1:" so we can detect already-encrypted / legacy-plaintext data and
// rotate the format later.
// ---------------------------------------------------------------------------

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY || process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
  // Normalize any key format (base64/hex/utf8) to a fixed 32-byte key.
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypt a secret string. No-op for empty values or already-encrypted ones. */
export function encryptSecret(plain?: string | null): string | undefined {
  if (!plain) return plain ?? undefined;
  if (plain.startsWith(PREFIX)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decrypt a value produced by encryptSecret. Legacy plaintext passes through. */
export function decryptSecret(value?: string | null): string | undefined {
  if (!value) return value ?? undefined;
  if (!value.startsWith(PREFIX)) return value; // legacy/plaintext
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}
